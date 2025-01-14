const { task } = require("hardhat/config");

task(
    "deploy",
    "Deploys the whole contracts suite and verifies source code on Etherscan"
)
    .addFlag("withValidators")
    .addOptionalParam("tokenRegistryAddress", "The token registry address")
    .addOptionalParam(
        "tokenRegistryListId",
        "The token registry list id to be used to validate tokens"
    )
    .addOptionalParam("factoryAddress", "The address of Swapr's pairs factory")
    .addFlag(
        "verify",
        "Additional (and optional) Etherscan contracts verification"
    )
    .setAction(async (taskArguments, hre) => {
        const {
            tokenRegistryAddress,
            tokenRegistryListId,
            factoryAddress,
            verify,
            withValidators,
        } = taskArguments;

        if (
            withValidators &&
            (!tokenRegistryAddress || !tokenRegistryListId || !factoryAddress)
        ) {
            throw new Error(
                "token registry address/list di and factory address are required"
            );
        }

        await hre.run("clean");
        await hre.run("compile");

        let rewardTokensValidator = {
            address: "0x0000000000000000000000000000000000000000",
        };
        let stakableTokenValidator = {
            address: "0x0000000000000000000000000000000000000000",
        };
        if (withValidators) {
            const DefaultRewardTokensValidator = hre.artifacts.require(
                "DefaultRewardTokensValidator"
            );
            rewardTokensValidator = await DefaultRewardTokensValidator.new(
                tokenRegistryAddress,
                tokenRegistryListId
            );

            const DefaultStakableTokenValidator = hre.artifacts.require(
                "DefaultStakableTokenValidator"
            );
            stakableTokenValidator = await DefaultStakableTokenValidator.new(
                tokenRegistryAddress,
                tokenRegistryListId,
                factoryAddress
            );
        }

        const ERC20StakingRewardsDistribution = hre.artifacts.require(
            "ERC20StakingRewardsDistribution"
        );
        const erc20DistributionImplementation = await ERC20StakingRewardsDistribution.new();
        const DXdaoERC20StakingRewardsDistributionFactory = hre.artifacts.require(
            "DXdaoERC20StakingRewardsDistributionFactory"
        );
        const factory = await DXdaoERC20StakingRewardsDistributionFactory.new(
            rewardTokensValidator.address,
            stakableTokenValidator.address,
            erc20DistributionImplementation.address
        );

        if (verify) {
            if (withValidators) {
                await hre.run("verify", {
                    address: rewardTokensValidator.address,
                    constructorArguments: [
                        tokenRegistryAddress,
                        tokenRegistryListId,
                    ],
                });
                await hre.run("verify", {
                    address: stakableTokenValidator.address,
                    constructorArguments: [
                        tokenRegistryAddress,
                        tokenRegistryListId,
                        factoryAddress,
                    ],
                });
            }
            await hre.run("verify", {
                address: factory.address,
                constructorArguments: [
                    rewardTokensValidator.address,
                    stakableTokenValidator.address,
                    erc20DistributionImplementation.address,
                ],
            });
            console.log(`source code verified`);
        }

        if (withValidators) {
            console.log(
                `reward tokens validator deployed at address ${rewardTokensValidator.address}`
            );
            console.log(
                `stakable token validator deployed at address ${stakableTokenValidator.address}`
            );
        }
        console.log(`factory deployed at address ${factory.address}`);
    });
