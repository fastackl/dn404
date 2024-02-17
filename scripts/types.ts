import { Addressable, BaseContract, ContractTransactionResponse } from "ethers";

type BaseArg = string | number | boolean | Addressable;
type ArgArray<T> = Array<T | ArgArray<T>>;
/** Arg can be a single argument or an array of arguments including nested arrays of arguments
 * See ./scripts/interfaces/iScriptsConfig.ts 
*/
type Args = ArgArray<BaseArg>;

/** Format for libraries required by ethers deploy function
 * value can be address ref like "ContractName.address" or otherwise specific address 
 * See ./scripts/interfaces/iScriptsConfig.ts */
 type Libraries = {[libraryName: string]: Addressable | string};

 /** ./scripts/config/scriptsConfig.ts contains configuration arrays to deploy, initialize and/or verify contracts */
 type ActionArray = ConfigInput[] | ConfigInputStrict[];
 
 type ConfigInput = DeployConfig | InitializeConfig | VerifyConfig;
 
 type ConfigInputStrict = DeployConfigStrict | InitializeConfigStrict | VerifyConfigStrict;

type DeploymentAddresses = {
   [network: string]:{
       [contractName: string]: Addressable | string;
   }
}

type Integer = number & { __integer__: void };

type uint8 = number & { readonly __brand: unique symbol };

type uint256 = bigint & { readonly __brand: unique symbol };

/** See ./scripts/config/scriptsConfig.ts */
type VerifyConfig = string;

interface ArgumentObject{
    args: Args;
    argNames?: string[];
    argSigs?: string[];
}

interface ArgumentObjectStrict{
    args: Args;
    argNames: string[];
    argSigs: string[];
}

/** Main config object in ./scripts/config/scriptsConfig.ts */
interface Config{
    networks: {[network: string]: NetworkConfig;}
}

/** Object containing ethers Contract instances keyed by contract name */
interface DeployedContractInstances{
    [contractName: string]: BaseContract;
}

/** Object containing contract deployment metadata keyed by contract name */
interface DeployedContractMetadata{
    [contractName: string]: SingleDeploymentMetadata;
}

/** See ./scripts/config/scriptsConfig.ts */
interface DeployConfig {
    fqn_contractName: string;
    fqn_filePath?: string;
    fqn?: string;
    args?: ArgumentObject;
    libraries?: Libraries;
}
/**
 * Strict version of DeployConfig that requires all fields to be defined
 * See ./scripts/config/scriptsConfig.ts
 */
interface DeployConfigStrict {
    fqn_contractName: string;
    fqn_filePath: string;
    fqn: string;
    args: ArgumentObjectStrict;
    libraries: Libraries;
}

/** See ./scripts/config/scriptsConfig.ts */
interface InitializeConfig {
    fqn_contractName: string;
    function: string;
    args?: ArgumentObject;
}

/**
 * Strict version of InitializeConfig that requires all fields to be defined
 * See ./scripts/config/scriptsConfig.ts
 */
interface InitializeConfigStrict {
    fqn_contractName: string;
    function: string;
    args: ArgumentObjectStrict;
    address: Addressable | string;
}

/** Config object in ./scripts/config/scriptsConfig.ts is organized by network (e.g. localhost, sepolia, mainnet etc) */
interface NetworkConfig{
    deploy: DeployConfig[];
    initialize: InitializeConfig[];
    verify: VerifyConfig[];
}

/**
 * Describes the result of a transaction, which may include the transaction response,
 * an error message, and associated metadata.
 */
interface ResultRows {
    success: string[][];
    error: string[][];
}

/**
 * Contains metadata for deployed contracts, keyed by the contract name.
 */
interface SingleDeploymentMetadata {
    contractName: string;
    sourcePath: string;
    args: ArgumentObjectStrict;
    libraries: Libraries;
    abi: string;
    buildTime: string;
    network: string;
    txHash: string;
    address: Addressable | string;       
}

interface TransactionResult {
    contractName: string;
    tx?: ContractTransactionResponse;
    error?: string;
    metadata?: SingleDeploymentMetadata;
}

/**
 * Strict version of VerifyConfig that requires all fields to be defined
 * Note VerifyConfig is just a string[] of contract names
 * So VerifyConfigStrict is the object after additional properties are retrieved from deployed contract metadata
 * See ./scripts/config/scriptsConfig.ts
 */

interface VerifyConfigStrict {
    fqn_contractName: string;
    fqn_filePath: string;
    fqn: string;
    address: Addressable | string;
    args: ArgumentObjectStrict;
    libraries: Libraries;
}

function isArgumentObject(value: any): value is ArgumentObject {
    return value && typeof value === 'object' && 'args' in value;
}

function isArgumentObjectStrict(value: any): value is ArgumentObjectStrict {
    return value && typeof value === 'object' && 'args' in value && 'argNames' in value && 'argSigs' in value;
}

function isDeployConfigStrict(action: any): action is DeployConfigStrict {
    return 'fqn_contractName' in action && 'fqn_filePath' in action && 'fqn' in action && 'args' in action && 'libraries' in action;
}

function isInitializeConfigStrict(action: any): action is InitializeConfigStrict {
    return 'fqn_contractName' in action && 'function' in action && 'args' in action;
}

function isLibraries(value: any): value is Libraries {
    return value && typeof value === 'object' && 
        !('args' in value || 'argNames' in value || 'argSigs' in value) &&
        Object.entries(value).every(([key, val]) => 
            typeof key === 'string' && (typeof val === 'string' || typeof val === 'object')
        );
}

function isVerifyConfigStrict(action: any): action is VerifyConfigStrict {
    return 'fqn_contractName' in action && 'fqn_filePath' in action && 'fqn' in action && 'address' in action && 'args' in action && 'libraries' in action;
}

function toInteger(n: number): Integer {
    if (!Number.isInteger(n)) {
      throw new Error("Number is not an integer");
    }
    return n as Integer;
}

function toUint8(value: number): uint8 {
    if (value < 0 || value > 255 || !Number.isInteger(value)) {
        throw new Error('Value out of range for uint8');
    }
    return value as uint8;
}

function toUint256(value: bigint): uint256 {
    if (value < 0n || value > 2n**256n - 1n) {
        throw new Error('Value out of range for uint256');
    }
    return value as uint256;
}  

export {
    ActionArray,
    Args,
    ArgumentObject,
    ArgumentObjectStrict,
    BaseArg,
    Config,
    ConfigInput,
    ConfigInputStrict,
    DeployedContractInstances,
    DeployedContractMetadata,
    DeployConfig,
    DeployConfigStrict,
    DeploymentAddresses,
    InitializeConfig,
    InitializeConfigStrict,
    Integer,
    Libraries,
    NetworkConfig,
    ResultRows,
    SingleDeploymentMetadata,
    TransactionResult,
    uint8,
    uint256,
    VerifyConfig,
    VerifyConfigStrict,
    isArgumentObject,
    isArgumentObjectStrict,
    isDeployConfigStrict,
    isInitializeConfigStrict,
    isLibraries,
    isVerifyConfigStrict,  
    toInteger,
    toUint8,
    toUint256  
}