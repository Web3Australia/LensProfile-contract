// SPDX-License-Identifier: MIT
//Documentation at Chiru Labs: https://github.com/chiru-labs/ERC721A
pragma solidity ^0.8.4;

import "erc721a/contracts/ERC721A.sol";
import "erc721a/contracts/extensions/ERC721ABurnable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract NFTa is ERC721A, ERC721ABurnable {
    string private baseURI;

    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseURI_
    ) ERC721A(name_, symbol_) {
        baseURI = baseURI_;
    }

    function exists(uint256 tokenId) public view returns (bool) {
        return _exists(tokenId);
    }

    function safeMint(address to, uint256 quantity) public {
        _safeMint(to, quantity);
    }

    function getBaseURI() public view returns (string memory) {
        return baseURI;
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721A, IERC721A)
        returns (string memory)
    {
        require(_exists(tokenId), "Nonexistent token");
        return
            string(
                abi.encodePacked(
                    baseURI,
                    "/",
                    Strings.toString(tokenId),
                    ".json"
                )
            );
    }

    function getOwnershipAt(uint256 index)
        public
        view
        returns (TokenOwnership memory)
    {
        return _ownershipAt(index);
    }

    function getOwnershipOf(uint256 tokenId)
        public
        view
        returns (TokenOwnership memory)
    {
        return _ownershipOf(tokenId);
    }

    function totalMinted() public view returns (uint256) {
        return _totalMinted();
    }

    function totalBurned() public view returns (uint256) {
        return _totalBurned();
    }
}
