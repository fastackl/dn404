import { ethers, run } from "hardhat";
import { BaseContract, ContractTransactionResponse, Network } from "ethers";
import { promises as fs } from "fs";
import * as utils from "./utils";
import "colors";

import * as types from "./types";

import hardhat_config from '../hardhat.config';
import scripts_config from "./config/scriptsConfig";

let PRINT: boolean;
let NETWORK: Network;
const DEPLOY: keyof types.NetworkConfig  = 'deploy';
const PREVIEWHEADERS: string[] = ['Contract'.cyan,'Constr Args'.cyan,'Libs'.cyan];
const PREVIEWCOLWIDTHS: number[] = [20,40,40];
const POSTHEADERS: string[] = ['Contract'.cyan,'Address'.cyan,'Response'.cyan];
const POSTCOLWIDTHS: number[] = [20,40,40];
const PREVIEWMSG: string = '\n\n\nDeployment preview:';
const POSTMSG: string = 'Deployment results:';
const COMPLETIONMSG: string = 'Deployment complete.';
const TRUNCATELENGTH: number = 377;
const DEPLOYEDCONTRACTINSTANCES: types.DeployedContractInstances = {};
const deployedContractMetadata: types.DeployedContractMetadata = {};

async function archiveArtifacts() {
  const triggerArchive = await utils.directoryExistsAndHasFiles(hardhat_config.paths.deployments);
  if(triggerArchive){
      await utils.archive();
  }
}

/** For use in utils.handleTransactionResponse() */
async function createDeploymentResultRows(config: types.ConfigInputStrict,logMessages: string[],result?: types.TransactionResult): Promise<types.ResultRows>{
    if (types.isDeployConfigStrict(config)) {
        const truncTx = result?.tx ? JSON.stringify(result?.tx).substring(0, TRUNCATELENGTH) : '';
        const successArray: string[][] = [
            [
                '  ' + config.fqn_contractName,
                '  ' + result?.metadata?.address.toString(),
                `  ${truncTx}`.green
            ]
        ];
        const errorArray: string[][] = [
            [
                '  ' + config.fqn_contractName,
                '',
                '  ' + result?.error?.red + ' ' + logMessages.join(' ').red
            ]
        ];
        const resultRows = {
            success: successArray,
            error: errorArray
        }
        return resultRows;
    } else {
        throw new Error(`Unsupported config type: ${config}`);
    }
}

async function deploySingleContract(
    config: types.ConfigInputStrict,
  ): Promise<types.TransactionResult> {
    if (types.isDeployConfigStrict(config)) {
        if (!config.fqn) {
            const errorMsg = 'deploy01: fqn is undefined for config';
            console.log(`deploy02: ${errorMsg}`);
            return {
              contractName: config.fqn_contractName, 
              error: errorMsg,
              metadata: undefined
            };
          }
        
          try {
            const deployment = await prepareAndDeployContract(config);
            const tx = deployment.contract.deploymentTransaction();
            const metadata = await saveDeploymentData(config, deployment.contract, NETWORK, tx);
        
            return {
              contractName: config.fqn_contractName,
              metadata: metadata[config.fqn_contractName] as types.SingleDeploymentMetadata,
              tx: tx as ContractTransactionResponse,
            };
          } catch (err) {
            const errorMsg = `deploy03: Error deploying contract: ${err instanceof Error ? err.message : err}`;
            console.log(errorMsg);
            return {
              contractName: config.fqn_contractName,
              error: errorMsg,
            };
          }
    } else {
      throw new Error(`Unsupported config type: ${config}`);
    }
}

async function deployPreProcessing(): Promise<types.DeployConfigStrict[]> {
  NETWORK = await ethers.provider.getNetwork();
  const networkName = await utils.getNetworkName(NETWORK);

  /** Convert the deployconfig to strict deploy config (see ./scripts/interfaces/types.ts) */
  let strictDeployConfig = await utils.convertActionArrayToStrict(scripts_config.networks[networkName], DEPLOY) as types.DeployConfigStrict[];

  /** This is a workaround that forces hardhat to compile contracts slated for deployment in scripts-config.ts even if they are not imported by any other contract */
  // await utils.writeTempImportsSol(strictDeployConfig);
  await run('compile');

  /** Mapping operation on strictDeployConfig to grab constructor argument names and sigs
  */
  strictDeployConfig = await utils.handleDeployArgsNamesAndSigs(strictDeployConfig);
  
  return strictDeployConfig;
}

async function prepareAndDeployContract(config: types.DeployConfigStrict): Promise<{ contract: BaseContract }> {
    const strictDeployConfig = await utils.replaceDotAddressReferences(config, deployedContractMetadata) as types.DeployConfigStrict;
    const ContractFactory = await ethers.getContractFactory(config.fqn!, { libraries: strictDeployConfig.libraries });
    const contract = await ContractFactory.deploy(...strictDeployConfig.args.args)
      .then(contract => contract.waitForDeployment());
  
    DEPLOYEDCONTRACTINSTANCES[config.fqn_contractName] = contract;
    return { contract };
  }

/** Hardhat doesn't save the contract's source file path, address and other info we'll need so we need to do it ourselves */
async function saveDeploymentData(deployConfig: types.DeployConfigStrict, contract: BaseContract, network: Network, tx: ContractTransactionResponse | null): Promise<types.DeployedContractMetadata> {
    await utils.createDirIfENOENT(hardhat_config.paths.deployments);
    const deploymentData: types.SingleDeploymentMetadata = {
        contractName: deployConfig.fqn_contractName,
        sourcePath: deployConfig.fqn_filePath,
        args: deployConfig.args,
        libraries: deployConfig.libraries,
        abi: contract.interface.formatJson(),
        buildTime: new Date().toISOString(),
        network: network.name,
        txHash: tx ? tx.hash : "",
        address: await contract.getAddress()
    };
    const deploymentDataString = JSON.stringify(deploymentData);
    try {
        await fs.writeFile(`${hardhat_config.paths.deployments}/${deployConfig.fqn_contractName}.json`,deploymentDataString);
    } catch (error) {
        console.error(`deploy03: ${(error as Error).message}`);
    }

    deployedContractMetadata[deployConfig.fqn_contractName] = deploymentData;
    return deployedContractMetadata;
}

async function deploy(printTable: boolean = false){
    PRINT = printTable || process.env.PRINT === 'true';
    console.log('Hardhat auto-compile (not optional) . . .');

    /** Archive existing artifacts, deployments and typechain */
    await archiveArtifacts();

    let strictDeployConfig = await deployPreProcessing();

    /** Script will print pre-deployment if PRINT==true
     * Also suppresses console.log
     */
    await utils.setupPreviewTable(PRINT, strictDeployConfig, PREVIEWMSG, PREVIEWCOLWIDTHS, PREVIEWHEADERS);

    /** Post-deployment table is a stream and prints if PRINT==true
     * Also suppresses console.log
     */
    let postDeployStream = await utils.setupStreamTable(PRINT, POSTCOLWIDTHS, POSTHEADERS, POSTMSG) as utils.CustomStream;
    
    await utils.executeAndProcessResults(strictDeployConfig, deploySingleContract,postDeployStream, PRINT,createDeploymentResultRows);

    /** Remove TempImportsSol as not needed after deploy
     * Also reenables console.log */
    // await utils.deleteTempImportsSol();
    await utils.completionMsg(PRINT, COMPLETIONMSG);

    return DEPLOYEDCONTRACTINSTANCES;
}

async function testDeploy(){
  let strictDeployConfig = await deployPreProcessing();
  
  await utils.executeAndProcessResults(strictDeployConfig, deploySingleContract);

  // await utils.deleteTempImportsSol();

  return DEPLOYEDCONTRACTINSTANCES;
}

export { testDeploy };

if (require.main === module) {
  deploy().catch((error) => {
    console.error('deploy04: ',error);
    process.exitCode = 1;
  });
}


