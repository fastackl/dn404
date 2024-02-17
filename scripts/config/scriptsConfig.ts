import { Config } from '../types';

const config: Config = {
    networks:{
        localhost: {
            deploy: [
                {
                    fqn_contractName: "DN404Mirror",
                    args: {args:["SIGNER[0]"]}
                },
                {
                    fqn_contractName: "SimpleDN404",
                    args: {args:["SimpleDN404", "DN404",10000,18,"SIGNER[0]","DN404Mirror.address"]},
                },
            ],
            initialize: [],
            verify: [],
        },
        sepolia: {
            deploy: [
                {
                    fqn_contractName: "DN404Mirror",
                    args: {args:["SIGNER[0]"]}
                },
                {
                    fqn_contractName: "SimpleDN404",
                    args: {args:["SimpleDN404", "DN404",10000,18,"SIGNER[0]","DN404Mirror.address"]},
                },
            ],
            initialize: [],
            verify: ['ALL'],
        }
    }
};

export default config;