// SPDX-License-Identifier: MIT
//Documentation at Chiru Labs: https://github.com/chiru-labs/ERC721A
pragma solidity ^0.8.10;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol";

struct ProfileMetadata {
    uint256 profileId;
    string twitterHandle;
    string githubHandle;
    string telegramHandle;
    string discordHandle;
    uint256 tokenId;
    address owner;
}

struct Signature {
    uint8 v;
    bytes32 r;
    bytes32 s;
}

contract ProfileExtend is
    Initializable,
    ERC721Upgradeable,
    ERC721BurnableUpgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    //Address for signature verification
    address private signer;
    //Swith for the minting
    bool private mintingEnabled;
    uint256 private maxSupply;
    /** @dev The base NFT URI. **/
    string private baseURI;

    using CountersUpgradeable for CountersUpgradeable.Counter;
    CountersUpgradeable.Counter private _tokenIdCounter;

    mapping(uint256 => ProfileMetadata) private profileMetadatas;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        string memory name_,
        string memory symbol_,
        string memory baseURI_
    ) public initializer {
        __ERC721_init(name_, symbol_);
        __ERC721Burnable_init();
        __Ownable_init();
        __UUPSUpgradeable_init();
        mintingEnabled = false;
        maxSupply = 10000;
        baseURI = baseURI_;
    }

    function safeMint(
        uint256 profileId,
        string memory twitterHandle,
        string memory githubHandle,
        string memory telegramHandle,
        string memory discordHandle,
        Signature calldata signature
    ) external {
        require(mintingEnabled, "Minting is not enabled");
        require(profileId > 0, "Profile ID must be greater than 0");
        require(
            (bytes(twitterHandle).length > 0 ||
                bytes(githubHandle).length > 0 ||
                bytes(telegramHandle).length > 0 ||
                bytes(discordHandle).length > 0),
            "Must have at least one handle"
        );
        bytes32 messagehash = keccak256(
            abi.encodePacked(
                profileId,
                twitterHandle,
                githubHandle,
                telegramHandle,
                discordHandle
            )
        );
        require(
            recoverSigner(messagehash, signature) == signer,
            "Invalid signature"
        );
        uint256 tokenId = _tokenIdCounter.current();
        require(tokenId <= maxSupply, "Max supply reached");

        _safeMint(msg.sender, tokenId); //always mint 1

        ProfileMetadata memory metadata = ProfileMetadata(
            profileId,
            twitterHandle,
            githubHandle,
            telegramHandle,
            discordHandle,
            tokenId,
            msg.sender
        );
        profileMetadatas[profileId] = metadata;

        _tokenIdCounter.increment();
    }

    function updateProfileMetadata(
        uint256 profileId,
        string memory twitterHandle,
        string memory githubHandle,
        string memory telegramHandle,
        string memory discordHandle,
        uint256 tokenId,
        Signature calldata signature
    ) external {
        require(mintingEnabled, "Minting is not enabled");
        require(
            _exists(tokenId) && ownerOf(tokenId) == msg.sender,
            "Not the owner of the token"
        );

        bytes32 messagehash = keccak256(
            abi.encodePacked(
                profileId,
                twitterHandle,
                githubHandle,
                telegramHandle,
                discordHandle
            )
        );
        require(
            recoverSigner(messagehash, signature) == signer,
            "Invalid signature"
        );
        ProfileMetadata storage metadata = profileMetadatas[profileId];
        require(metadata.tokenId == tokenId, "Token ID does not match");
        require(metadata.profileId == profileId, "Profile ID does not match");
        require(metadata.owner == msg.sender, "Not the owner of the token");

        if (bytes(metadata.twitterHandle).length == 0) {
            metadata.twitterHandle = twitterHandle;
        }
        if (bytes(metadata.githubHandle).length == 0) {
            metadata.githubHandle = githubHandle;
        }
        if (bytes(metadata.telegramHandle).length == 0) {
            metadata.telegramHandle = telegramHandle;
        }
        if (bytes(metadata.discordHandle).length == 0) {
            metadata.discordHandle = discordHandle;
        }
    }

    function getProfile(uint256 _profileId)
        public
        view
        returns (ProfileMetadata memory)
    {
        return profileMetadatas[_profileId];
    }

    function enableMinting() external onlyOwner {
        mintingEnabled = true;
    }

    function getMaxSupply() external view returns (uint256) {
        return maxSupply;
    }

    function getBaseURI() external view returns (string memory) {
        return baseURI;
    }

    function totalMinted() external view returns (uint256) {
        return _tokenIdCounter.current();
    }

    function setupSigner(address _signer) external onlyOwner {
        signer = _signer;
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyOwner
    {}

    function recoverSigner(bytes32 message, Signature memory signature)
        public
        pure
        returns (address)
    {
        bytes32 prefixedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", message)
        );
        return ecrecover(prefixedHash, signature.v, signature.r, signature.s);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        require(
            _exists(tokenId),
            "ERC721Metadata: URI query for nonexistent token"
        );

        string memory base = baseURI;
        return
            bytes(base).length > 0
                ? string(
                    abi.encodePacked(
                        base,
                        StringsUpgradeable.toString(tokenId),
                        ".json"
                    )
                )
                : "";
    }
}
