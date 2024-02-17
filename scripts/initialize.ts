import { ethers } from "hardhat";
import { BaseContract, Contract, ContractTransactionResponse, Network } from "ethers";
import * as utils from "./utils";
import "colors";
import * as types from "./types";
import scripts_config from "./config/scriptsConfig";

let PRINT: boolean;
let NETWORK: Network;
const INITIALIZE: keyof types.NetworkConfig  = 'initialize';
let DEPLOYEDCONTRACTMETADATA: types.DeployedContractMetadata = {};
const PREVIEWMSG: string = '\n\n\nInitialization preview:';
const PREVIEWCOLWIDTHS: number[] = [20,40,40];
const PREVIEWCOLHEADERS: string[] = ['Contract'.cyan, 'Function'.cyan, 'Args'.cyan];
const POSTCOLWIDTHS: number[] = [15,15,35,35];
const POSTHEADERS: string[] = ['Contract'.cyan, 'Function'.cyan, 'Args'.cyan, 'Response'.cyan];
const POSTMSG: string = 'Initialization results:';
const COMPLETIONMSG: string = 'Initialization complete.';
const TRUNCATELENGTH: number = 377;

async function convertInitializeConfigToStrict(networkName: string) {
    return await utils.convertActionArrayToStrict(scripts_config.networks[networkName], INITIALIZE) as types.InitializeConfigStrict[];
}

async function callSingleFunction(
        config: types.ConfigInputStrict,
        metadata?: types.SingleDeploymentMetadata
    ): Promise<types.TransactionResult>{

    if(types.isInitializeConfigStrict(config)){
        if(!metadata){
            throw new Error(`init02: Metadata not found for contract ${config.fqn_contractName}`);
        }
        // We release typeguards because we don't know what methods the contract has at this point.
        // However below we'll include a typeof check on contractFunction to ensure the function exists and throw error if it doesn't.
        const contract = await utils.getContractInstance(config.fqn_contractName, { [config.fqn_contractName]: metadata }) as Contract;
        const contractFunction = contract[config.function];
        if (typeof contractFunction !== 'function'){
            throw new Error(`init01: Function ${config.function} not found on contract ${config.fqn_contractName}`);        
        }
        const result: types.TransactionResult = {
            contractName: config.fqn_contractName,
            metadata: metadata
        };
        try {
            const tx: ContractTransactionResponse = await contractFunction(...config.args.args);
            const txReceipt = await tx.wait();

            txReceipt ? result['tx'] = tx : result['error'] = 'init02: txReceipt is null';
            return result;
        } catch (err){
            result['error'] = `init03: Error calling function: ${err instanceof Error ? err.message : err}`;
            console.log(result['error']);
            return result;        
        }         
    } else {
        throw new Error(`Unsupported config type: ${config}`);
    }
}

async function createInitializationResultRows(config: types.ConfigInputStrict,logMessages: string[], result?: types.TransactionResult): Promise<types.ResultRows>{
    if(types.isInitializeConfigStrict(config)){
        const truncTx = result?.tx ? JSON.stringify(result.tx).substring(0, TRUNCATELENGTH) : '';
        const successArray: string[][] = [
            ['  ' + result?.metadata?.contractName],
            ['  ' + config.function],
            utils.formatArgString(config),
            [`  ${truncTx}`.green]
        ];
        const errorArray: string[][] = [
            ['  ' + result?.metadata?.contractName],
            ['  ' + config.function],
            utils.formatArgString(config),        
            ['  ' + result?.error?.red + ' ' + logMessages.join('').red]
        ];
        const resultRows = {
            success: utils.spreadArray(successArray),
            error: utils.spreadArray(errorArray)
        }
        return resultRows;
    } else {
        throw new Error(`Unsupported config type: ${config}`);
    }
}

async function initializePreProcessing(): Promise<types.InitializeConfigStrict[]>{
    /** Network setup */
    NETWORK = await ethers.provider.getNetwork();
    const networkName = await utils.getNetworkName(NETWORK);
    
    /** Populate initialize config */
    let strictInitializeConfig = await convertInitializeConfigToStrict(networkName);
    strictInitializeConfig = await utils.handleInitializeArgsNamesAndSigs(strictInitializeConfig);

    /** Get deployment info (e.g. contract address, abi etc.) */
    DEPLOYEDCONTRACTMETADATA = await utils.loadDeployedContractMetadata();

    /** Replace .address references in initialize config */
    strictInitializeConfig = await Promise.all(strictInitializeConfig.map(async (config) =>
        utils.replaceDotAddressReferences(config, DEPLOYEDCONTRACTMETADATA) as Promise<types.InitializeConfigStrict>
    ));

    return strictInitializeConfig;
}

async function initialize(printTable: boolean = false){
    PRINT = printTable || process.env.PRINT === 'true';

    let strictInitializeConfig = await initializePreProcessing();

    await utils.setupPreviewTable(PRINT, strictInitializeConfig, PREVIEWMSG, PREVIEWCOLWIDTHS, PREVIEWCOLHEADERS);

    let initStream = await utils.setupStreamTable(PRINT,POSTCOLWIDTHS,POSTHEADERS,POSTMSG) as utils.CustomStream;

    /** Call each initialization contract function */
    await utils.executeAndProcessResults(strictInitializeConfig, callSingleFunction,initStream,PRINT,createInitializationResultRows, DEPLOYEDCONTRACTMETADATA);

    await utils.completionMsg(PRINT,COMPLETIONMSG);

}

    /** Leaner version of initialization for testing at speed */
async function testInitialize(){
    let strictInitializeConfig = await initializePreProcessing();

    await utils.executeAndProcessResults(strictInitializeConfig, callSingleFunction, undefined, undefined, undefined, DEPLOYEDCONTRACTMETADATA);
}

export { testInitialize };

if (require.main === module){
    initialize().catch((error) => {
        console.error('init04: ', error);
        process.exitCode = 1;
    });
}