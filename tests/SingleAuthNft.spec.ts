import { ethers } from "hardhat";
import { BigNumberish } from "ethers";
import { expect } from "chai";
import { SingleAuthNft, SingleAuthNft__factory } from "../build/typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";

type Signature = {
  v: BigNumberish;
  r: string;
  s: string;
};

let nft: SingleAuthNft;
let deployer: SignerWithAddress;
let alice: SignerWithAddress;
let bob: SignerWithAddress;
let signer: SignerWithAddress;

describe("SingleAuthNft", () => {
  before(async () => {
    [deployer, alice, bob, signer] = await ethers.getSigners();

    nft = await new SingleAuthNft__factory(deployer).deploy();
  });

  it("Should return correct info for deployer", async () => {
    expect(nft.address).to.not.be.undefined;
    expect(await nft.name()).to.equal("Single Auth NFT");
    expect(await nft.symbol()).to.equal("SANFT");
  });

  it("Should only allow valid signature to mint nft", async () => {
    const signature = await signMintMessage(
      1,
      "@zhexiang.eth",
      "twitter",
      deployer
    );

    await expect(
      nft
        .connect(signer)
        .mint(
          ethers.constants.AddressZero,
          "@zhexiang.eth",
          "twitter",
          1,
          signature
        )
    ).to.be.revertedWith("Invalid address");

    await nft
      .connect(signer)
      .mint(await alice.getAddress(), "@zhexiang.eth", "twitter", 1, signature);

    expect(await nft.balanceOf(await alice.getAddress())).to.equal(1);
    expect(await nft.tokenURI(0)).to.equal("https://www.lens-profile.xyz/0");
  });

  it("Should not allow to transfer nft", async () => {
    await expect(
      nft
        .connect(alice)
        .transferFrom(await alice.getAddress(), await bob.getAddress(), 0)
    ).to.be.revertedWith("Transfer not enabled");
  });

  it("Should not allow to mint nft with invalid signature", async () => {
    const signature = await signMintMessage(
      1,
      "@zhexiang.eth",
      "twitter",
      signer
    );

    await expect(
      nft
        .connect(signer)
        .mint(
          await alice.getAddress(),
          "@zhexiang.eth",
          "twitter",
          1,
          signature
        )
    ).to.be.revertedWith("Invalid signature");
  });

  it("Should not allow owner to burn nft", async () => {
    await expect(nft.connect(deployer).burn(0)).to.be.revertedWith(
      "ERC721Burnable: caller is not owner nor approved"
    );
  });

  it("Should allow owner to burn nft", async () => {
    await nft.connect(alice).burn(0);
    expect(await nft.balanceOf(await alice.getAddress())).to.equal(0);
  });

  it("Should allow owner to burn batch", async () => {
    const signatureTwitter = await signMintMessage(
      2,
      "@zhexiang.eth",
      "twitter",
      deployer
    );
    const signatureGithub = await signMintMessage(
      2,
      "zhexiang",
      "github",
      deployer
    );

    const signatureDiscord = await signMintMessage(
      1,
      "zhexiang",
      "discord",
      deployer
    );

    await nft
      .connect(bob)
      .mint(
        await bob.getAddress(),
        "@zhexiang.eth",
        "twitter",
        2,
        signatureTwitter
      );
    await nft
      .connect(bob)
      .mint(await bob.getAddress(), "zhexiang", "github", 2, signatureGithub);

    await nft
      .connect(alice)
      .mint(
        await alice.getAddress(),
        "zhexiang",
        "discord",
        1,
        signatureDiscord
      );

    expect(await nft.balanceOf(await bob.getAddress())).to.equal(2);
    expect(await nft.ownerOf(1)).to.equal(await bob.getAddress());
    expect(await nft.ownerOf(2)).to.equal(await bob.getAddress());

    await expect(nft.connect(bob).burnBatch([])).to.be.revertedWith(
      "Invalid tokenIds"
    );

    await expect(nft.connect(bob).burnBatch([3])).to.be.revertedWith(
      "ERC721Burnable: caller is not owner nor approved"
    );

    await nft.connect(bob).burnBatch([1, 2]);

    expect(await nft.balanceOf(await bob.getAddress())).to.equal(0);
  });
});

async function signMintMessage(
  profileId: number,
  handle: string,
  handleType: string,
  signer: SignerWithAddress
): Promise<Signature> {
  const message = ethers.utils.solidityKeccak256(
    ["uint256", "string", "string"],
    [profileId, handle, handleType]
  );
  return await signMessage(message, signer);
}

async function signMessage(message: string, signer: SignerWithAddress) {
  const sig = await signer.signMessage(ethers.utils.arrayify(message));
  const { v, r, s } = ethers.utils.splitSignature(sig);
  return { v, r, s };
}
