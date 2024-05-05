// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "../DN404.sol";
import "../DN404Mirror.sol";
import {Ownable} from "solady/auth/Ownable.sol";
import {LibString} from "solady/utils/LibString.sol";
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";
import {MerkleProofLib} from "solady/utils/MerkleProofLib.sol";

/**
 * @title NFTMintDN404
 * @notice Sample DN404 contract that demonstrates the owner selling NFTs rather than the fungible token.
 * The underlying call still mints ERC20 tokens, but to the end user it'll appear as a standard NFT mint.
 * Each address is limited to MAX_PER_WALLET total mints.
 */
contract NFTMintDN404 is DN404, Ownable {
    string private _name;
    string private _symbol;
    string private _baseURI;
    bytes32 private _allowlistRoot;
    uint96 public publicPrice; // uint96 is sufficient to represent all ETH in existence.
    uint96 public allowlistPrice; // uint96 is sufficient to represent all ETH in existence.
    uint32 public totalMinted; // DN404 only supports up to `2**32 - 2` tokens.
    bool public live;

    uint32 public constant MAX_PER_WALLET = 13;
    uint32 public constant MAX_SUPPLY = 5000;

    error InvalidProof();
    error InvalidMint();
    error InvalidPrice();
    error TotalSupplyReached();
    error NotLive();

    constructor(
        string memory name_,
        string memory symbol_,
        bytes32 allowlistRoot_,
        uint96 publicPrice_,
        uint96 allowlistPrice_,
        uint96 initialTokenSupply,
        address initialSupplyOwner
    ) {
        _initializeOwner(msg.sender);

        _name = name_;
        _symbol = symbol_;
        _allowlistRoot = allowlistRoot_;
        publicPrice = publicPrice_;
        allowlistPrice = allowlistPrice_;

        address mirror = address(new DN404Mirror(msg.sender));
        _initializeDN404(initialTokenSupply, initialSupplyOwner, mirror);
    }

    modifier onlyLive() {
        if (!live) {
            revert NotLive();
        }
        _;
    }

    modifier checkPrice(uint256 price, uint256 nftAmount) {
        if (price * nftAmount != msg.value) {
            revert InvalidPrice();
        }
        _;
    }

    modifier checkAndUpdateTotalMinted(uint256 nftAmount) {
        uint256 newTotalMinted = uint256(totalMinted) + nftAmount;
        if (newTotalMinted > MAX_SUPPLY) {
            revert TotalSupplyReached();
        }
        totalMinted = uint32(newTotalMinted);
        _;
    }

    modifier checkAndUpdateBuyerMintCount(uint256 nftAmount) {
        uint256 currentMintCount = _getAux(msg.sender);
        uint256 newMintCount = currentMintCount + nftAmount;
        if (newMintCount > MAX_PER_WALLET) {
            revert InvalidMint();
        }
        _setAux(msg.sender, uint88(newMintCount));
        _;
    }

    function mint(
        uint256 nftAmount
    )
        public
        payable
        onlyLive
        checkPrice(publicPrice, nftAmount)
        checkAndUpdateBuyerMintCount(nftAmount)
        checkAndUpdateTotalMinted(nftAmount)
    {
        _mint(msg.sender, nftAmount * _unit());
    }

    function allowlistMint(
        uint256 nftAmount,
        bytes32[] calldata proof
    )
        public
        payable
        onlyLive
        checkPrice(allowlistPrice, nftAmount)
        checkAndUpdateBuyerMintCount(nftAmount)
        checkAndUpdateTotalMinted(nftAmount)
    {
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        if (!MerkleProofLib.verifyCalldata(proof, _allowlistRoot, leaf)) {
            revert InvalidProof();
        }
        _mint(msg.sender, nftAmount * _unit());
    }

    function setBaseURI(string calldata baseURI_) public onlyOwner {
        _baseURI = baseURI_;
    }

    function setPrices(
        uint96 publicPrice_,
        uint96 allowlistPrice_
    ) public onlyOwner {
        publicPrice = publicPrice_;
        allowlistPrice = allowlistPrice_;
    }

    function toggleLive() public onlyOwner {
        live = !live;
    }

    function withdraw() public onlyOwner {
        SafeTransferLib.safeTransferAllETH(msg.sender);
    }

    function name() public view override returns (string memory) {
        return _name;
    }

    function symbol() public view override returns (string memory) {
        return _symbol;
    }

    function _tokenURI(
        uint256 tokenId
    ) internal view override returns (string memory result) {
        if (bytes(_baseURI).length != 0) {
            result = string(
                abi.encodePacked(_baseURI, LibString.toString(tokenId))
            );
        }
    }

    /// @dev Returns if `a` has bytecode of non-zero length.
    function hasCode_(address a) private view returns (bool result) {
        /// @solidity memory-safe-assembly
        assembly {
            result := extcodesize(a) // Can handle dirty upper bits.
        }
    }

    /// @dev Returns a storage data pointer for account `owner` AddressData
    ///
    /// Initializes account `owner` AddressData if it is not currently initialized.
    function addressData(
        address owner
    ) public virtual returns (AddressData memory d) {
        d = _getDN404Storage().addressData[owner];
        unchecked {
            if (_isZero(d.flags & _ADDRESS_DATA_INITIALIZED_FLAG)) {
                uint256 skipNFT = _toUint(hasCode_(owner)) *
                    _ADDRESS_DATA_SKIP_NFT_FLAG;
                d.flags = uint8(skipNFT | _ADDRESS_DATA_INITIALIZED_FLAG);
            }
        }
    }

    /// @dev Sets the caller's skipNFT flag to `skipNFT`. Returns true.
    ///
    /// Emits a {SkipNFTSet} event.
    function setSkipNFT(bool skipNFT) public virtual override returns (bool) {
        _setSkipNFT(msg.sender, skipNFT);
        return true;
    }

    function transfer(
        address to,
        uint256 amount
    ) public virtual override returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    /// @dev Returns the total NFT supply.
    function totalNFTSupply() public view virtual returns (uint256) {
        return _getDN404Storage().totalNFTSupply;
    }

    function ownedIds(
        address owner,
        uint256 begin,
        uint256 end
    ) public view virtual returns (uint256[] memory ids) {
        return _ownedIds(owner, begin, end);
    }
}
