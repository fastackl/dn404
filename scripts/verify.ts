import { ethers, run } from "hardhat";
import * as utils from "./utils";
import "colors";
import * as types from "./types";
import scripts_config from "./config/scriptsConfig";

let PRINT;
let DEPLOYEDCONTRACTMETADATA: types.DeployedContractMetadata = {};
const VERIFY: keyof types.NetworkConfig  = 'verify';

const PREVIEWHEADERS: string[] = ['Contract'.cyan,'Constr Args'.cyan,'Libs'.cyan];
const PREVIEWCOLWIDTHS: number[] = [20,40,40];
const POSTHEADERS: string[] = ['Contract'.cyan,'Constr Args'.cyan,'Libs'.cyan,'Response'.cyan];
const POSTCOLWIDTHS: number[] = [15,15,35,35];
const PREVIEWMSG: string = '\n\n\nVerification preview:';
const POSTMSG: string = 'Verification results:';
const COMPLETIONMSG: string = 'Verification complete.'
const TRUNCATELENGTH: number = 377;

async function createVerificationResponseRows(config: types.ConfigInputStrict, logMessages: string[], result?: types.TransactionResult): Promise<types.ResultRows>{
    if(types.isVerifyConfigStrict(config)){
        const truncatedMessages = (JSON.stringify(logMessages) + `result: + ${JSON.stringify(result)}`).substring(0, TRUNCATELENGTH);
        const successArray = [
                [ '  ' + config.fqn_contractName + ` (${config.address})`.gray],
                utils.formatArgString(config),
                utils.formatLibString(config),
                [ ` ${truncatedMessages}`.green],
            ]
        const errorArray = [
            [ '  ' + config.fqn_contractName + ` (${config.address})`.gray],
            utils.formatArgString(config),
            utils.formatLibString(config),
            [ ` ${truncatedMessages}`.red],
        ]
        const resultRows = {
            success: utils.spreadArray(successArray),
            error: utils.spreadArray(errorArray)
        }
        return resultRows
    } else {
        throw new Error(`verify01: Invalid config object: ${JSON.stringify(config)}`);
    }
}

async function etherscanVerify(config: types.ConfigInputStrict, metadata?: types.SingleDeploymentMetadata): Promise<void> {
    if(types.isVerifyConfigStrict(config)){
        if(!metadata){
            throw new Error(`verify02: Metadata not found for contract ${config.fqn_contractName}`);
        }
        const contractName = config.fqn_contractName;
        return await run("verify:verify", {
            contract: `${metadata.sourcePath}:${contractName}`,
            address: metadata.address,
            constructorArguments: metadata.args.args,
            libraries: metadata.libraries,
        });
    } else {
        throw new Error(`verify01: Invalid config object: ${JSON.stringify(config)}`);
    }
}

async function verifyPreProcessing(): Promise<types.VerifyConfigStrict[]>{
    /** Network setup */
    const network = await ethers.provider.getNetwork();
    const networkName = await utils.getNetworkName(network);

    const verifyConfig = await utils.convertActionArrayToStrict(scripts_config.networks[networkName], VERIFY) as types.VerifyConfigStrict[];
    DEPLOYEDCONTRACTMETADATA = await utils.loadDeployedContractMetadata();
    return verifyConfig;
};

async function verify(printTable: boolean = false){
    PRINT = printTable || process.env.PRINT === 'true';

    let verifyConfig = await verifyPreProcessing();
    
    await utils.setupPreviewTable(PRINT, verifyConfig,PREVIEWMSG, PREVIEWCOLWIDTHS,PREVIEWHEADERS);

    let verifyStream = await utils.setupStreamTable(PRINT,POSTCOLWIDTHS,POSTHEADERS, POSTMSG) as utils.CustomStream;

    await utils.executeAndProcessResults(verifyConfig,etherscanVerify,verifyStream,PRINT,createVerificationResponseRows,DEPLOYEDCONTRACTMETADATA);

    await utils.completionMsg(PRINT, COMPLETIONMSG);
}

async function testVerify(){
    let verifyConfig = await verifyPreProcessing();
    await utils.executeAndProcessResults(verifyConfig,etherscanVerify,undefined,undefined,undefined,DEPLOYEDCONTRACTMETADATA);
};

export { testVerify };

if (require.main === module){
    verify().catch((error) => {
        console.error('verify01: ',error);
        process.exitCode = 1;
    });
}

