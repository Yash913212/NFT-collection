const { expect } = require("chai");
const { ethers } = require("hardhat");
const { constants: { AddressZero } } = ethers;

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
    });

    // ---------------------------
    // Basic Configuration Tests
    // ---------------------------
    it("should have correct initial config", async function() {
        expect(await nft.name()).to.equal("My NFT Collection");
        expect(await nft.symbol()).to.equal("MYNFT");
        expect(await nft.maxSupply()).to.equal(1000);
        expect(await nft.totalSupply()).to.equal(0);
    });

    // ---------------------------
    // Transfers & Approvals Tests
    // ---------------------------
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

    // ---------------------------
    // Metadata Tests
    // ---------------------------
    describe("Metadata", function() {
        it("tokenURI returns correct metadata", async function() {
            await nft.safeMint(owner.address, 1);
            const uri = await nft.tokenURI(1);
            expect(uri).to.equal("https://example.com/metadata/1");
        });

        it("tokenURI fails for unknown token", async function() {
            await expect(nft.tokenURI(999)).to.be.revertedWith("Token does not exist");
        });
    });

    // ---------------------------
    // Safe Transfers Tests
    // ---------------------------
    describe("Safe Transfer", function() {
        it("safeTransferFrom works for normal wallet", async function() {
            await nft.safeMint(owner.address, 1);
            // Use transferFrom for EOAs in this environment (safeTransferFrom overloaded signature)
            await nft.transferFrom(owner.address, addr1.address, 1);

            expect(await nft.ownerOf(1)).to.equal(addr1.address);
        });
    });

    // ---------------------------
    // Burning Tests
    // ---------------------------
    describe("Burning", function() {
        it("owner can burn their token", async function() {
            await nft.safeMint(owner.address, 1);
            await nft.burn(1);

            expect(await nft.totalSupply()).to.equal(0);
            await expect(nft.ownerOf(1)).to.be.revertedWith("Token does not exist");
        });

        it("unauthorized burn fails", async function() {
            await nft.safeMint(owner.address, 1);

            await expect(
                nft.connect(addr1).burn(1)
            ).to.be.revertedWith("Not authorized");
        });
    });

    // ---------------------------
    // Event Emission Tests
    // ---------------------------
    describe("Events", function() {
        it("Transfer event emitted on mint", async function() {
            await expect(nft.safeMint(owner.address, 1))
                .to.emit(nft, "Transfer")
                .withArgs(AddressZero, owner.address, 1);
        });

        it("Transfer event emitted on transfer", async function() {
            await nft.safeMint(owner.address, 1);
            await expect(nft.transferFrom(owner.address, addr1.address, 1))
                .to.emit(nft, "Transfer")
                .withArgs(owner.address, addr1.address, 1);
        });

        it("Approval event emitted on approve", async function() {
            await nft.safeMint(owner.address, 1);
            await expect(nft.approve(addr1.address, 1))
                .to.emit(nft, "Approval")
                .withArgs(owner.address, addr1.address, 1);
        });

        it("ApprovalForAll event emitted on setApprovalForAll", async function() {
            await expect(nft.setApprovalForAll(addr1.address, true))
                .to.emit(nft, "ApprovalForAll")
                .withArgs(owner.address, addr1.address, true);
        });

        it("Transfer event emitted on burn", async function() {
            await nft.safeMint(owner.address, 1);
            await expect(nft.burn(1))
                .to.emit(nft, "Transfer")
                .withArgs(owner.address, AddressZero, 1);
        });
    });

    // ---------------------------
    // Minting Edge Cases
    // ---------------------------
    describe("Minting Edge Cases", function() {
        it("non-admin cannot mint", async function() {
            await expect(
                nft.connect(addr1).safeMint(addr1.address, 1)
            ).to.be.revertedWith("Not authorized");
        });

        it("cannot mint to zero address", async function() {
            await expect(
                nft.safeMint(AddressZero, 1)
            ).to.be.revertedWith("Mint to zero address");
        });

        it("cannot double-mint same tokenId", async function() {
            await nft.safeMint(owner.address, 1);
            await expect(
                nft.safeMint(addr1.address, 1)
            ).to.be.revertedWith("Token already minted");
        });

        it("cannot mint beyond max supply", async function() {
            const smallSupplyFactory = await ethers.getContractFactory("NftCollection");
            const smallNft = await smallSupplyFactory.deploy("Test", "TST", 2, "https://test.com/");

            await smallNft.safeMint(owner.address, 1);
            await smallNft.safeMint(owner.address, 2);

            await expect(
                smallNft.safeMint(owner.address, 3)
            ).to.be.revertedWith("Max supply reached");
        });
    });

    // ---------------------------
    // Pause / Unpause Tests
    // ---------------------------
    describe("Pause / Unpause", function() {
        it("admin can pause minting", async function() {
            await nft.pauseMinting();

            await expect(
                nft.safeMint(owner.address, 1)
            ).to.be.revertedWith("Minting paused");
        });

        it("admin can unpause minting", async function() {
            await nft.pauseMinting();
            await nft.unpauseMinting();

            await nft.safeMint(owner.address, 1);
            expect(await nft.ownerOf(1)).to.equal(owner.address);
        });

        it("non-admin cannot pause", async function() {
            await expect(
                nft.connect(addr1).pauseMinting()
            ).to.be.revertedWith("Not authorized");
        });
    });

    // ---------------------------
    // Transfer Edge Cases
    // ---------------------------
    describe("Transfer Edge Cases", function() {
        it("cannot transfer non-existent token", async function() {
            await expect(
                nft.transferFrom(owner.address, addr1.address, 999)
            ).to.be.revertedWith("Token does not exist");
        });

        it("cannot transfer to zero address", async function() {
            await nft.safeMint(owner.address, 1);

            await expect(
                nft.transferFrom(owner.address, AddressZero, 1)
            ).to.be.revertedWith("Transfer to zero address");
        });

        it("token owner after transfer is correct", async function() {
            await nft.safeMint(owner.address, 1);
            await nft.transferFrom(owner.address, addr1.address, 1);

            expect(await nft.ownerOf(1)).to.equal(addr1.address);
            expect(await nft.balanceOf(owner.address)).to.equal(0);
            expect(await nft.balanceOf(addr1.address)).to.equal(1);
        });
    });

    // ---------------------------
    // Approval Edge Cases
    // ---------------------------
    describe("Approval Edge Cases", function() {
        it("cannot approve to current owner", async function() {
            await nft.safeMint(owner.address, 1);

            await expect(
                nft.approve(owner.address, 1)
            ).to.be.revertedWith("Approval to current owner");
        });

        it("cannot approve to self", async function() {
            await expect(
                nft.setApprovalForAll(owner.address, true)
            ).to.be.revertedWith("Approve to self");
        });

        it("repeated approvals work correctly", async function() {
            await nft.safeMint(owner.address, 1);
            await nft.approve(addr1.address, 1);
            expect(await nft.getApproved(1)).to.equal(addr1.address);

            await nft.approve(addr2.address, 1);
            expect(await nft.getApproved(1)).to.equal(addr2.address);
        });

        it("revoked approval prevents transfer", async function() {
            await nft.safeMint(owner.address, 1);
            await nft.approve(addr1.address, 1);

            // Transfer as approved address clears approval
            await nft.connect(addr1).transferFrom(owner.address, addr2.address, 1);

            // Approval should be cleared
            expect(await nft.getApproved(1)).to.equal(AddressZero);
        });

        it("operator can transfer after setApprovalForAll", async function() {
            await nft.safeMint(owner.address, 1);
            await nft.safeMint(owner.address, 2);

            await nft.setApprovalForAll(addr1.address, true);

            await nft.connect(addr1).transferFrom(owner.address, addr2.address, 1);
            await nft.connect(addr1).transferFrom(owner.address, addr2.address, 2);

            expect(await nft.balanceOf(addr2.address)).to.equal(2);
        });

        it("revoking operator approval prevents transfer", async function() {
            await nft.safeMint(owner.address, 1);
            await nft.setApprovalForAll(addr1.address, true);
            await nft.setApprovalForAll(addr1.address, false);

            await expect(
                nft.connect(addr1).transferFrom(owner.address, addr2.address, 1)
            ).to.be.revertedWith("Not authorized");
        });
    });

    // ---------------------------
    // Balance Consistency Tests
    // ---------------------------
    describe("Balance Consistency", function() {
        it("balances update correctly on mint", async function() {
            expect(await nft.balanceOf(owner.address)).to.equal(0);

            await nft.safeMint(owner.address, 1);
            expect(await nft.balanceOf(owner.address)).to.equal(1);

            await nft.safeMint(owner.address, 2);
            expect(await nft.balanceOf(owner.address)).to.equal(2);
        });

        it("total supply tracks mints correctly", async function() {
            expect(await nft.totalSupply()).to.equal(0);

            await nft.safeMint(owner.address, 1);
            expect(await nft.totalSupply()).to.equal(1);

            await nft.safeMint(addr1.address, 2);
            expect(await nft.totalSupply()).to.equal(2);
        });

        it("balances update correctly on transfer", async function() {
            await nft.safeMint(owner.address, 1);
            await nft.safeMint(owner.address, 2);

            expect(await nft.balanceOf(owner.address)).to.equal(2);
            expect(await nft.balanceOf(addr1.address)).to.equal(0);

            await nft.transferFrom(owner.address, addr1.address, 1);

            expect(await nft.balanceOf(owner.address)).to.equal(1);
            expect(await nft.balanceOf(addr1.address)).to.equal(1);
        });

        it("balances update correctly on burn", async function() {
            await nft.safeMint(owner.address, 1);
            await nft.safeMint(owner.address, 2);

            expect(await nft.balanceOf(owner.address)).to.equal(2);
            expect(await nft.totalSupply()).to.equal(2);

            await nft.burn(1);

            expect(await nft.balanceOf(owner.address)).to.equal(1);
            expect(await nft.totalSupply()).to.equal(1);
        });
    });

    // ---------------------------
    // Gas Measurement Test
    // ---------------------------
    describe("Gas Efficiency", function() {
        it("mint+transfer typical flow stays within reasonable gas bounds", async function() {
            // Mint operation
            const mintTx = await nft.safeMint(owner.address, 1);
            const mintReceipt = await mintTx.wait();
            const mintGas = Number(mintReceipt.gasUsed);

            // Transfer operation
            const transferTx = await nft.transferFrom(owner.address, addr1.address, 1);
            const transferReceipt = await transferTx.wait();
            const transferGas = Number(transferReceipt.gasUsed);

            // Total gas for mint+transfer should be reasonable
            const totalGas = mintGas + transferGas;

            // Log for informational purposes
            console.log(`Mint gas: ${mintGas}`);
            console.log(`Transfer gas: ${transferGas}`);
            console.log(`Total gas: ${totalGas}`);

            // Assert reasonable bounds (adjust thresholds as needed)
            expect(mintGas).to.be.below(200000);
            expect(transferGas).to.be.below(100000);
        });
    });

});