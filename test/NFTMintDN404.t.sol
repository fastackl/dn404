// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./utils/SoladyTest.sol";
import "lib/forge-std/src/console2.sol";
import {NFTMintDN404} from "../src/example/NFTMintDN404.sol";
import {DN404Mirror} from "../src/DN404Mirror.sol";

contract NFTMintDN404Test is SoladyTest {
    uint256 internal constant _WAD = 10 ** 18;

    NFTMintDN404 dn;

    address alice = address(111);
    address bob = address(222);

    bytes32 allowlistRoot;

    uint96 publicPrice = 0.02 ether;
    uint96 allowlistPrice = 0.01 ether;

    function setUp() public {
        // Single leaf, so the root is the leaf.
        allowlistRoot = bytes32(keccak256(abi.encodePacked(alice)));

        dn = new NFTMintDN404(
            "DN404",
            "DN",
            allowlistRoot,
            publicPrice,
            allowlistPrice,
            uint96(1000 * _WAD),
            address(this)
        );
        dn.toggleLive();
        payable(bob).transfer(10 ether);
        payable(alice).transfer(10 ether);
    }

    function testMint() public {
        vm.startPrank(bob);

        console2.log("Bob mints 10");

        dn.mint{value: 10 * publicPrice}(10);
        assertEq(dn.totalSupply(), 1010 * _WAD);
        assertEq(dn.balanceOf(bob), 10 * _WAD);

        NFTMintDN404.AddressData memory bobData;
        uint nftSupply;
        bobData = dn.addressData(bob);
        nftSupply = dn.totalNFTSupply();
        console2.log("Bob's ownedLength:", bobData.ownedLength);
        console2.log("Total NFT supply:", nftSupply);
        console2.log("");

        console2.log("Bob sets skip NFT to true");
        console2.log("");
        dn.setSkipNFT(true);

        console2.log("Bob sends 9 to alice");
        dn.transfer(alice, 9 * _WAD);

        bobData = dn.addressData(bob);
        nftSupply = dn.totalNFTSupply();
        console2.log("Bob's ownedLength: %s", bobData.ownedLength);
        console2.log("Total NFT supply: %s", nftSupply);
        console2.log("");

        vm.stopPrank();

        console2.log("Alice sends 9 back to bob");
        vm.startPrank(alice);
        dn.transfer(bob, 9 * _WAD);

        bobData = dn.addressData(bob);
        console2.log("Bob's ownedLength: %s", bobData.ownedLength);
        console2.log("Total NFT supply: %s", nftSupply);
        console2.log("");

        vm.stopPrank();

        vm.startPrank(bob);
        console2.log("Bob sets skip NFT to false");
        console2.log("");
        dn.setSkipNFT(false);
        console2.log("Bob mints another 3 NFTs");
        dn.mint{value: 3 * publicPrice}(3);
        assertEq(dn.totalSupply(), 1013 * _WAD);
        assertEq(dn.balanceOf(bob), 13 * _WAD);

        bobData = dn.addressData(bob);
        console2.log("ownedLength: %s", bobData.ownedLength);
        console2.log("Total NFT supply: %s", nftSupply);

        vm.stopPrank();
    }
}
