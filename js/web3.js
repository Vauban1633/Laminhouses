// web3.js
const CONTRACT_ADDRESS = "0xF137CD350De928379D7973a1487476ec6f54972C";
const CONTRACT_ABI = [
    // ERC721 Standard Methods
    {
        "inputs": [{"internalType": "address", "name": "owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
        "name": "ownerOf",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
        "name": "tokenURI",
        "outputs": [{"internalType": "string", "name": "", "type": "string"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "totalSupply",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "index", "type": "uint256"}],
        "name": "tokenByIndex",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "address", "name": "owner", "type": "address"},
            {"internalType": "uint256", "name": "index", "type": "uint256"}
        ],
        "name": "tokenOfOwnerByIndex",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    }
];

class Web3Handler {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.contract = null;
        this.userAddress = null;
        this.REQUIRED_CHAIN_ID = '10849'; // Chain ID de Lamina1 Mainnet en format hexadécimal
        this.RPC_URL = 'https://subnets.avax.network/lamina1/mainnet/rpc';
    }

    async connect() {
        try {
            console.log("Starting Web3 connection...");
            if (typeof window.ethereum === "undefined") {
                throw new Error("MetaMask not installed");
            }

            // Vérifier le réseau actuel
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            if (chainId !== this.REQUIRED_CHAIN_ID) {
                try {
                    // Tenter de basculer vers Lamina1
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: this.REQUIRED_CHAIN_ID }],
                    });
                } catch (switchError) {
                    // Si le réseau n'existe pas dans MetaMask, l'ajouter
                    if (switchError.code === 4902) {
                        try {
                            await window.ethereum.request({
                                method: 'wallet_addEthereumChain',
                                params: [{
                                    chainId: this.REQUIRED_CHAIN_ID,
                                    chainName: 'Lamina1 Mainnet',
                                    nativeCurrency: {
                                        name: 'L1',
                                        symbol: 'L1',
                                        decimals: 18
                                    },
                                    rpcUrls: [this.RPC_URL],
                                    blockExplorerUrls: ['https://explorer.lamina1.com']
                                }]
                            });
                        } catch (addError) {
                            throw new Error(`Failed to add Lamina1 network: ${addError.message}`);
                        }
                    } else {
                        throw new Error(`Failed to switch to Lamina1 network: ${switchError.message}`);
                    }
                }
            }

            console.log("Creating Web3 provider...");
            this.provider = new ethers.providers.Web3Provider(window.ethereum);
            
            // Vérifier si le contrat existe à l'adresse spécifiée
            const code = await this.provider.getCode(CONTRACT_ADDRESS);
            if (code === '0x') {
                throw new Error('Contract not found at specified address');
            }

            console.log("Creating contract instance...");
            this.contract = new ethers.Contract(
                CONTRACT_ADDRESS,
                CONTRACT_ABI,
                this.provider
            );

            console.log("Requesting accounts...");
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            this.signer = this.provider.getSigner();
            this.userAddress = await this.signer.getAddress();
            console.log("User address:", this.userAddress);

            return true;
        } catch (error) {
            console.error("Connection error:", error);
            throw error;
        }
    }

    async getNFTDataFromContract(contract, tokenId) {
        try {
            const tokenURI = await contract.tokenURI(tokenId);
            const metadataURL = this.ipfsToHttp(tokenURI);
            const response = await fetch(metadataURL);
            const metadata = await response.json();

            return {
                tokenId: tokenId.toString(),
                name: metadata.name,
                description: metadata.description,
                image: this.ipfsToHttp(metadata.image),
                attributes: metadata.attributes || []
            };
        } catch (error) {
            console.error(`Error getting NFT data for token ${tokenId}:`, error);
            return null;
        }
    }

    async getUserNFTs() {
        try {
            if (!this.userAddress) return [];

            const balance = await this.contract.balanceOf(this.userAddress);
            const userNFTs = [];

            for (let i = 0; i < balance; i++) {
                const tokenId = await this.contract.tokenOfOwnerByIndex(this.userAddress, i);
                const nftData = await this.getNFTData(tokenId);
                if (nftData) {
                    userNFTs.push(nftData);
                }
            }

            return userNFTs;
        } catch (error) {
            console.error("Error getting user NFTs:", error);
            return [];
        }
    }

    async getAllNFTs() {
        try {
            const totalSupply = await this.contract.totalSupply();
            const allNFTs = [];

            for (let i = 0; i < totalSupply; i++) {
                const tokenId = await this.contract.tokenByIndex(i);
                const nftData = await this.getNFTData(tokenId);
                if (nftData) {
                    allNFTs.push(nftData);
                }
            }

            return allNFTs;
        } catch (error) {
            console.error("Error getting all NFTs:", error);
            return [];
        }
    }

    async getNFTData(tokenId) {
        try {
            const tokenURI = await this.contract.tokenURI(tokenId);
            const metadataURL = this.ipfsToHttp(tokenURI);
            const response = await fetch(metadataURL);
            const metadata = await response.json();

            return {
                tokenId: tokenId.toString(),
                name: metadata.name,
                description: metadata.description,
                image: this.ipfsToHttp(metadata.image),
                attributes: metadata.attributes || []
            };
        } catch (error) {
            console.error(`Error getting NFT data for token ${tokenId}:`, error);
            return null;
        }
    }

    ipfsToHttp(url) {
        if (!url) return '';
        if (url.startsWith('ipfs://')) {
            return url.replace('ipfs://', 'https://ipfs.io/ipfs/');
        }
        return url;
    }
}

// Créer une instance globale
window.web3Handler = new Web3Handler();

// Émettre un événement quand web3Handler est prêt
document.dispatchEvent(new Event('web3Loaded'));