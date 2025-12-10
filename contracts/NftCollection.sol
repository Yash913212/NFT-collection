// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title NftCollection - ERC-721 compatible NFT collection
/// @notice Implements basic NFT minting, transfers, approvals, metadata, and burning
contract NftCollection {
    // =========================
    // State variables
    // =========================

    string private _name;
    string private _symbol;

    uint256 private _maxSupply;
    uint256 private _totalSupply;

    // tokenId => owner
    mapping(uint256 => address) private _owners;

    // owner => balance
    mapping(address => uint256) private _balances;

    // tokenId => approved address
    mapping(uint256 => address) private _tokenApprovals;

    // owner => (operator => approved)
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    // admin (contract owner)
    address private _admin;
    bool private _mintPaused;

    // base URI for metadata
    string private _baseTokenURI;

    // =========================
    // Events (ERC-721 standard)
    // =========================

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    // =========================
    // Access control
    // =========================

    modifier onlyAdmin() {
        require(msg.sender == _admin, "Not authorized");
        _;
    }

    // =========================
    // Constructor
    // =========================

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 maxSupply_,
        string memory baseTokenURI_
    ) {
        _name = name_;
        _symbol = symbol_;
        _maxSupply = maxSupply_;
        _baseTokenURI = baseTokenURI_;
        _admin = msg.sender;
        _mintPaused = false;
    }

    // =========================
    // Pause / Unpause minting
    // =========================

    function pauseMinting() external onlyAdmin {
        _mintPaused = true;
    }

    function unpauseMinting() external onlyAdmin {
        _mintPaused = false;
    }

    // =========================
    // Public view functions
    // =========================

    function name() external view returns (string memory) {
        return _name;
    }

    function symbol() external view returns (string memory) {
        return _symbol;
    }

    function maxSupply() external view returns (uint256) {
        return _maxSupply;
    }

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address owner) public view returns (uint256) {
        require(owner != address(0), "Invalid address");
        return _balances[owner];
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address owner = _owners[tokenId];
        require(owner != address(0), "Token does not exist");
        return owner;
    }

    function tokenURI(uint256 tokenId) public view returns (string memory) {
        require(_exists(tokenId), "Token does not exist");
        return string(abi.encodePacked(_baseTokenURI, _toString(tokenId)));
    }

    function supportsInterface(bytes4 interfaceId) public pure returns (bool) {
        return
            interfaceId == 0x80ac58cd || // ERC721
            interfaceId == 0x5b5e139f;   // ERC721Metadata
    }

    // =========================
    // Approvals
    // =========================

    function approve(address to, uint256 tokenId) external {
        address owner = ownerOf(tokenId);
        require(to != owner, "Approval to current owner");
        require(msg.sender == owner || isApprovedForAll(owner, msg.sender), "Not authorized");

        _tokenApprovals[tokenId] = to;
        emit Approval(owner, to, tokenId);
    }

    function getApproved(uint256 tokenId) public view returns (address) {
        require(_exists(tokenId), "Token does not exist");
        return _tokenApprovals[tokenId];
    }

    function setApprovalForAll(address operator, bool approved) external {
        require(operator != msg.sender, "Approve to self");
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address owner, address operator) public view returns (bool) {
        return _operatorApprovals[owner][operator];
    }

    // =========================
    // Transfers
    // =========================

    function transferFrom(address from, address to, uint256 tokenId) public {
        require(_isApprovedOrOwner(msg.sender, tokenId), "Not authorized");
        _transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) public {
        transferFrom(from, to, tokenId);
        require(_checkOnERC721Received(from, to, tokenId, ""), "Receiver not implemented");
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public {
        transferFrom(from, to, tokenId);
        require(_checkOnERC721Received(from, to, tokenId, data), "Receiver not implemented");
    }

    function burn(uint256 tokenId) external {
        address owner = ownerOf(tokenId);
        require(_isApprovedOrOwner(msg.sender, tokenId), "Not authorized");

        // Clear approvals
        delete _tokenApprovals[tokenId];

        // Update balances & supply
        _balances[owner] -= 1;
        _totalSupply -= 1;

        // Remove ownership
        delete _owners[tokenId];

        emit Transfer(owner, address(0), tokenId);
    }

    // =========================
    // Minting logic
    // =========================

    function safeMint(address to, uint256 tokenId) external onlyAdmin {
        require(!_mintPaused, "Minting paused");
        _mint(to, tokenId);
    }

    // =========================
    // Internal helpers
    // =========================

    function _exists(uint256 tokenId) internal view returns (bool) {
        return _owners[tokenId] != address(0);
    }

    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view returns (bool) {
        address owner = ownerOf(tokenId);
        return (
            spender == owner ||
            getApproved(tokenId) == spender ||
            isApprovedForAll(owner, spender)
        );
    }

    function _transfer(address from, address to, uint256 tokenId) internal {
        require(ownerOf(tokenId) == from, "Not owner");
        require(to != address(0), "Transfer to zero address");

        // Clear existing approvals
        delete _tokenApprovals[tokenId];

        // Update balances
        _balances[from] -= 1;
        _balances[to] += 1;

        // Transfer ownership
        _owners[tokenId] = to;

        emit Transfer(from, to, tokenId);
    }

    function _mint(address to, uint256 tokenId) internal {
        require(to != address(0), "Mint to zero address");
        require(!_exists(tokenId), "Token already minted");
        require(_totalSupply < _maxSupply, "Max supply reached");

        _owners[tokenId] = to;
        _balances[to] += 1;
        _totalSupply += 1;

        emit Transfer(address(0), to, tokenId);
    }

    function _checkOnERC721Received(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) private returns (bool) {
        if (to.code.length == 0) {
            return true; // EOA
        }

        (bool success, bytes memory returndata) = to.call(
            abi.encodeWithSignature(
                "onERC721Received(address,address,uint256,bytes)",
                msg.sender,
                from,
                tokenId,
                data
            )
        );

        if (!success) {
            return false;
        }

        bytes4 retval = abi.decode(returndata, (bytes4));
        return retval == 0x150b7a02;
    }

    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
