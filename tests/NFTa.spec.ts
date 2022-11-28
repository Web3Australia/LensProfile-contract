import { ethers } from "hardhat";
import { ethers as tsEthers } from "ethers";
import { expect } from "chai";
import { isAddress } from "ethers/lib/utils";
import { NFTa, NFTa__factory } from "../build/typechain";

let token: NFTa;
let deployer: tsEthers.Signer;
let user: tsEthers.Wallet;

describe("ERC721a", () => {
  before(async () => {
    deployer = (await ethers.getSigners())[0];
    user = new ethers.Wallet(
      "0xbeefbeefbeefbeefbeefbeefbeefbeefbeefbeefbeefbeefbeefbeefbeefbeef",
      deployer.provider
    );
    token = await new NFTa__factory(deployer).deploy(
      "ERC721a",
      "NFTa",
      "https://ipfs.io/ipfs"
    );
    // Send ETH to user from signer.
    await deployer.sendTransaction({
      to: user.address,
      value: ethers.utils.parseEther("1000")
    });
  });

  it("Should deploy", async () => {
    //Check contract has deployed
    const address = token.address;
    const verifyAddress = isAddress(address);
    expect(verifyAddress === true);

    expect(await token.name()).to.equal("ERC721a");
    expect(await token.symbol()).to.equal("NFTa");
    expect(await token.totalMinted()).to.equal(0);
    expect(await token.totalBurned()).to.equal(0);
    expect(await token.getBaseURI()).to.equal("https://ipfs.io/ipfs");
  });

  it("Should mint tokens", async () => {
    await expect(token.connect(user).safeMint(user.address, 0)).revertedWith(
      "safeMint"
    );
    await token.safeMint(user.address, 5);
    const balance = await token.balanceOf(user.address);
    expect(balance).to.equal(5);

    //Check token exists
    const tokenExists = await token.exists(1);
    expect(tokenExists === true);
    await expect(token.tokenURI(19)).revertedWith("Nonexistent token");
    expect(await token.tokenURI(1)).to.equal("https://ipfs.io/ipfs/1.json");

    //Check total minted
    const total = await token.totalMinted();
    expect(total === ethers.utils.parseEther("5"));

    const owner = await token.getOwnershipOf(1);
    expect(owner[0]).to.equal(user.address);
  });

  it("Should return the owner of an indexed token", async () => {
    const tokenOwner = await token.getOwnershipAt(4);
    expect(tokenOwner.toString() === user.address);
  });
});
