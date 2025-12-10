const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NftCollection", function() {
    let NftCollection, nft, owner, addr1, addr2;

    beforeEach(async function() {
        [owner, addr1, addr2] = await ethers.getSigners();

        NftCollection = await ethers.getContractFactory("NftCollection");
        nft = await NftCollection.deploy(
            "My NFT Collection",
            "MYNFT",
            1000, // maxSupply
            "https://example.com/metadata/"
        );
        await nft.waitForDeployment();
    });

    it("should have correct initial config", async function() {
        expect(await nft.name()).to.equal("My NFT Collection");
        expect(await nft.symbol()).to.equal("MYNFT");
        expect(await nft.maxSupply()).to.equal(1000);
        expect(await nft.totalSupply()).to.equal(0);
    });

    describe("Transfers & Approvals", function() {
        it("owner can transfer their token", async function() {
            await nft.safeMint(owner.address, 1);

            await nft.transferFrom(owner.address, addr1.address, 1);

            expect(await nft.ownerOf(1)).to.equal(addr1.address);
            expect(await nft.balanceOf(addr1.address)).to.equal(1);
        });

        it("approved address can transfer", async function() {
            await nft.safeMint(owner.address, 1);

            await nft.approve(addr1.address, 1);
            await nft.connect(addr1).transferFrom(owner.address, addr1.address, 1);

            expect(await nft.ownerOf(1)).to.equal(addr1.address);
        });

        it("operator can transfer", async function() {
            await nft.safeMint(owner.address, 1);

            await nft.setApprovalForAll(addr1.address, true);
            await nft.connect(addr1).transferFrom(owner.address, addr1.address, 1);

            expect(await nft.ownerOf(1)).to.equal(addr1.address);
        });

        it("unauthorized transfer fails", async function() {
            await nft.safeMint(owner.address, 1);

            await expect(
                nft.connect(addr1).transferFrom(owner.address, addr2.address, 1)
            ).to.be.revertedWith("Not authorized");
        });
    });
});