// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";

struct Signature {
    uint8 v;
    bytes32 r;
    bytes32 s;
}

contract ProfileNft is ERC721, ERC721Enumerable, ERC721Burnable {
    using Counters for Counters.Counter;
    //Token ID counter
    Counters.Counter private _tokenIds;
    //Address of the contract
    address private self;
    //Address for signature verification
    address private signer;
    //Transfer enabled
    bool private transferEnabled;

    constructor() ERC721("Profile NFT", "PNFT") {
        self = address(this);
        signer = msg.sender;
        transferEnabled = false;
    }

    /**
     * @dev Mint a new NFT.
     * @param _to The address that will own the minted NFT.
     * @param _profileId The profile id of the user.
     * @param _hash The hash of the profile.
     * @param _signature The signature of the user.
     * @return A unique token ID.
     */
    function mint(
        address _to,
        uint256 _profileId,
        bytes32 _hash,
        Signature calldata _signature
    ) public returns (uint256) {
        require(_to != address(0), "Invalid address");
        bytes32 messagehash = keccak256(abi.encodePacked(_profileId, _hash));
        require(
            recoverSigner(messagehash, _signature) == signer,
            "Invalid signature"
        );
        uint256 newTokenId = _tokenIds.current();
        _mint(_to, newTokenId);
        _tokenIds.increment();
        return newTokenId;
    }

    /**
     * @dev Burns a specific NFT.
     */
    function burn(uint256 tokenId) public virtual override {
        require(
            _isApprovedOrOwner(_msgSender(), tokenId),
            "ERC721Burnable: caller is not owner nor approved"
        );
        _burn(tokenId);
    }

    function _baseURI() internal pure override returns (string memory) {
        return "https://www.lens-profile.xyz/profile/";
    }

    function _transfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override {
        require(transferEnabled, "Transfer not enabled");
        super._transfer(from, to, tokenId);
    }

    // The following functions are overrides required by Solidity.
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function recoverSigner(
        bytes32 message,
        Signature memory signature
    ) public pure returns (address) {
        bytes32 prefixedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", message)
        );
        return ecrecover(prefixedHash, signature.v, signature.r, signature.s);
    }
}
