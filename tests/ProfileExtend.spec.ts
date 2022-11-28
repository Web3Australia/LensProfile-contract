import { deployProxy } from "./../scripts/deploy/utils";
import { ethers } from "hardhat";
import { BigNumberish } from "ethers";
import { expect } from "chai";
import { ProfileExtend } from "../build/typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";

type Signature = {
  v: BigNumberish;
  r: string;
  s: string;
};

let token: ProfileExtend;
let deployer: SignerWithAddress;
let alice: SignerWithAddress;
let bob: SignerWithAddress;
let signer: SignerWithAddress;

describe("ProfileExtend", () => {
  before(async () => {
    [deployer, alice, bob, signer] = await ethers.getSigners();

    token = (await deployProxy(
      "ProfileExtend",
      ["Lens Profile Extend", "LPE", "https://lens.finance/"],
      deployer,
      1
    )) as ProfileExtend;
  });

  it("Should return correct info for deployer", async () => {
    expect(await token.name()).to.equal("Lens Profile Extend");
    expect(await token.symbol()).to.equal("LPE");
    expect(await token.totalMinted()).to.equal(0);
    expect(await token.getMaxSupply()).to.equal(10000);
    expect(await token.getBaseURI()).to.equal("https://lens.finance/");
  });

  it("Should only allow owner to enableMinting and setup signer", async () => {
    await expect(token.connect(alice).enableMinting()).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
    await expect(
      token.connect(alice).setupSigner(signer.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");

    //await token.enableMinting();
    await token.setupSigner(signer.address);
  });

  it("Should not be able to mint when minting disabled or profile id is invalid", async () => {
    const signature = await signMintMessage(
      1,
      "twitter ",
      "github handle",
      "telegram handle",
      "discord handle",
      signer
    );
    await expect(
      token.safeMint(
        1,
        "twitter ",
        "github handle",
        "telegram handle",
        "discord handle",
        signature
      )
    ).to.be.revertedWith("Minting is not enabled");

    await token.enableMinting();

    await expect(
      token.safeMint(
        0,
        "twitter ",
        "github handle",
        "telegram handle",
        "discord handle",
        signature
      )
    ).to.be.revertedWith("Profile ID must be greater than 0");
  });

  it("Should not be able to mint when signature is invalid", async () => {
    const signature = await signMintMessage(
      1,
      "twitter handle",
      "github handle",
      "telegram handle",
      "discord handle",
      alice
    );
    await expect(
      token
        .connect(alice)
        .safeMint(
          1,
          "twitter ",
          "github handle",
          "telegram handle",
          "discord handle",
          signature
        )
    ).to.be.revertedWith("Invalid signature");
  });

  it("Should be able to mint when signature is valid", async () => {
    const signature = await signMintMessage(
      1,
      "twitter handle",
      "github handle",
      "telegram handle",
      "discord handle",
      signer
    );

    await token
      .connect(alice)
      .safeMint(
        1,
        "twitter handle",
        "github handle",
        "telegram handle",
        "discord handle",
        signature
      );

    expect(await token.totalMinted()).to.equal(1);
    expect(await token.ownerOf(0)).to.equal(alice.address);
    expect(await token.tokenURI(0)).to.equal("https://lens.finance/0.json");
  });

  it("Should allow user to update profile", async () => {
    const signature = await signMintMessage(
      2,
      "twitter handle",
      "",
      "",
      "",
      signer
    );
    await token
      .connect(bob)
      .safeMint(2, "twitter handle", "", "", "", signature);

    expect(await token.totalMinted()).to.equal(2);
    expect(await token.ownerOf(1)).to.equal(bob.address);

    const profile = await token.getProfile(2);
    expect(profile[2]).to.equal("");

    const signature2 = await signMintMessage(
      2,
      "twitter handle",
      "github handle",
      "",
      "",
      signer
    );
    await token
      .connect(bob)
      .updateProfileMetadata(
        2,
        "twitter handle",
        "github handle",
        "",
        "",
        1,
        signature2
      );

    const updatedProfile = await token.getProfile(2);
    expect(updatedProfile[2]).to.equal("github handle");
  });
});

async function signMintMessage(
  profileId: Number,
  twitterHandle: string,
  githubHandle: string,
  telegramHandle: string,
  discordHandle: string,
  signer: SignerWithAddress
): Promise<Signature> {
  const message = ethers.utils.solidityKeccak256(
    ["uint256", "string", "string", "string", "string"],
    [profileId, twitterHandle, githubHandle, telegramHandle, discordHandle]
  );
  return await signMessage(message, signer);
}

async function signMessage(message: string, signer: SignerWithAddress) {
  const sig = await signer.signMessage(ethers.utils.arrayify(message));
  const { v, r, s } = ethers.utils.splitSignature(sig);
  return { v, r, s };
}
