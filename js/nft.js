// nft.js
class NFTPage {
    constructor() {
        this.tokenId = new URLSearchParams(window.location.search).get('id');
        this.connectButton = document.getElementById('connectWallet');
        this.descriptionDisplay = document.getElementById('descriptionDisplay');
        this.descriptionInput = document.getElementById('descriptionInput');
        this.editSection = document.getElementById('editSection');
        this.saveButton = document.getElementById('saveButton');
        this.nftImage = document.getElementById('nftImage');
        this.nftTitle = document.getElementById('nftTitle');
        this.inhabitantSelect = document.getElementById('inhabitantSelect');
        this.inhabitantControls = document.getElementById('inhabitantControls');
        this.inhabitantImage = document.getElementById('inhabitantImage');
        
        // Contract address for inhabitants
        this.INHABITANTS_CONTRACT_ADDRESS = "0xab4D71d5F5A7d6474c695a429B6a0a75bBfcb8C7";
        this.INHABITANTS_ABI = [
            {
                "inputs": [{"internalType": "address", "name": "owner", "type": "address"}],
                "name": "balanceOf",
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
            },
            {
                "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
                "name": "tokenURI",
                "outputs": [{"internalType": "string", "name": "", "type": "string"}],
                "stateMutability": "view",
                "type": "function"
            }
        ];

        // Lamina1 network configuration
        this.LAMINA1_CONFIG = {
            chainId: '0x2a61', // 10849 in hex
            chainName: 'Lamina1 Mainnet',
            nativeCurrency: {
                name: 'L1',
                symbol: 'L1',
                decimals: 18
            },
            rpcUrls: ['https://subnets.avax.network/lamina1/mainnet/rpc'],
            blockExplorerUrls: ['https://lamina1.blockscan.com/']
        };
        
        if (!this.tokenId) {
            console.error("No token ID provided");
            this.displayError("NFT not found");
            return;
        }
    }

    async initialize() {
        try {
            await this.initializeWeb3();
            this.setupEventListeners();
            await this.loadNFTData();
            await this.checkOwnership();
            
            if (window.web3Handler.userAddress) {
                this.connectButton.textContent = 'Connected';
                this.connectButton.disabled = true;
            }
        } catch (error) {
            console.error("Initialization error:", error);
            this.displayError("Failed to initialize NFT page. Please ensure your wallet is connected.");
        }
    }

    async loadNFTData() {
        try {
            console.log("Starting loadNFTData");
            console.log("web3Handler exists:", !!window.web3Handler);
            console.log("web3Handler contract exists:", !!window.web3Handler?.contract);
            
            if (!window.web3Handler || !window.web3Handler.contract) {
                throw new Error("Web3 not initialized");
            }

            console.log("TokenId:", this.tokenId);
            console.log("Attempting to get NFT data...");
            const nftData = await window.web3Handler.getNFTData(this.tokenId);
            console.log("NFT Data received:", nftData);
            
            if (!nftData) {
                throw new Error("Failed to load NFT data");
            }

            this.nftImage.src = nftData.image;
            this.nftTitle.textContent = nftData.name || `NFT #${this.tokenId}`;
            
            const savedDescription = localStorage.getItem(`nft_description_${this.tokenId}`);
            this.descriptionDisplay.textContent = savedDescription || nftData.description || "No description available.";
            
            if (this.descriptionInput) {
                this.descriptionInput.value = this.descriptionDisplay.textContent;
            }
        } catch (error) {
            console.error("Error loading NFT data:", error);
            this.displayError("Failed to load NFT data. Please ensure you are connected to the correct network.");
        }
    }

    displayError(message) {
        if (this.nftTitle) {
            this.nftTitle.textContent = "Error";
        }
        if (this.descriptionDisplay) {
            this.descriptionDisplay.textContent = message;
        }
        if (this.nftImage) {
            this.nftImage.style.display = 'none';
        }
        if (this.inhabitantControls) {
            this.inhabitantControls.classList.add('hidden');
        }
        if (this.editSection) {
            this.editSection.classList.add('hidden');
        }
    }

    async initializeWeb3() {
        try {
            if (!window.web3Handler) {
                await new Promise((resolve) => {
                    document.addEventListener('web3Loaded', resolve, { once: true });
                });
            }

            // Vérifier si le réseau actuel est Lamina1
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            if (chainId !== this.LAMINA1_CONFIG.chainId) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: this.LAMINA1_CONFIG.chainId }],
                    });
                } catch (switchError) {
                    // Si le réseau n'est pas configuré, l'ajouter
                    if (switchError.code === 4902) {
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [this.LAMINA1_CONFIG],
                        });
                    } else {
                        throw switchError;
                    }
                }
            }

            if (!window.web3Handler.contract) {
                await window.web3Handler.connect();
            }

            // Initialiser le contrat avec le provider Lamina1
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            
            this.inhabitantsContract = new ethers.Contract(
                this.INHABITANTS_CONTRACT_ADDRESS,
                this.INHABITANTS_ABI,
                signer
            );

            return window.web3Handler;
        } catch (error) {
            console.error("Web3 initialization error:", error);
            this.displayError(`Failed to initialize: ${error.message}`);
            throw error;
        }
    }

    setupEventListeners() {
        this.connectButton.addEventListener('click', async () => {
            try {
                await this.connectWallet();
            } catch (error) {
                console.error("Connection error:", error);
            }
        });
        this.saveButton.addEventListener('click', () => this.saveDescription());
        this.inhabitantSelect.addEventListener('change', () => this.updateInhabitantDisplay());
    }

    async connectWallet() {
        const connected = await window.web3Handler.connect();
        if (connected) {
            this.connectButton.textContent = 'Connected';
            this.connectButton.disabled = true;
            await this.checkOwnership();
            await this.loadNFTData();
        }
    }

    async saveDescription() {
        try {
            const newDescription = this.descriptionInput.value.trim();
            localStorage.setItem(`nft_description_${this.tokenId}`, newDescription);
            this.descriptionDisplay.textContent = newDescription;
            
            this.saveButton.textContent = "Saved!";
            setTimeout(() => {
                this.saveButton.textContent = "Save Description";
            }, 2000);
        } catch (error) {
            console.error("Error saving description:", error);
            this.saveButton.textContent = "Error Saving";
            setTimeout(() => {
                this.saveButton.textContent = "Save Description";
            }, 2000);
        }
    }

    async updateInhabitantDisplay() {
        const selectedTokenId = this.inhabitantSelect.value;
        
        if (selectedTokenId) {
            try {
                const tokenURI = await this.inhabitantsContract.tokenURI(selectedTokenId);
                const response = await fetch(tokenURI);
                const nftData = await response.json();
                
                this.inhabitantImage.src = nftData.image;
                this.inhabitantImage.classList.remove('hidden');
                
                localStorage.setItem(`inhabitant_${this.tokenId}`, selectedTokenId);
            } catch (error) {
                console.error("Error loading inhabitant NFT:", error);
            }
        } else {
            this.inhabitantImage.classList.add('hidden');
            localStorage.removeItem(`inhabitant_${this.tokenId}`);
        }
    }

    async loadUserInhabitants() {
        try {
            if (!window.web3Handler.userAddress) {
                console.log("No user address available");
                return;
            }

            const balance = await this.inhabitantsContract.balanceOf(window.web3Handler.userAddress);
            
            // Clear existing options except the first one
            while (this.inhabitantSelect.options.length > 1) {
                this.inhabitantSelect.remove(1);
            }

            // Convert balance to number and validate
            const balanceNumber = balance.toNumber();
            if (balanceNumber === 0) {
                console.log("User has no inhabitants");
                return;
            }

            for (let i = 0; i < balanceNumber; i++) {
                try {
                    const tokenId = await this.inhabitantsContract.tokenOfOwnerByIndex(
                        window.web3Handler.userAddress, 
                        i
                    );
                    
                    const tokenURI = await this.inhabitantsContract.tokenURI(tokenId);
                    const response = await fetch(tokenURI);
                    const nftData = await response.json();
                    
                    const option = document.createElement('option');
                    option.value = tokenId.toString();
                    option.textContent = nftData.name || `Inhabitant #${tokenId}`;
                    this.inhabitantSelect.appendChild(option);
                } catch (error) {
                    console.error(`Error loading inhabitant at index ${i}:`, error);
                    continue;
                }
            }

            // Load saved inhabitant selection
            const savedInhabitant = localStorage.getItem(`inhabitant_${this.tokenId}`);
            if (savedInhabitant) {
                this.inhabitantSelect.value = savedInhabitant;
                await this.updateInhabitantDisplay();
            }
        } catch (error) {
            console.error("Error loading user inhabitants:", error);
            throw error;
        }
    }

    async checkOwnership() {
        try {
            if (!window.web3Handler || !window.web3Handler.contract) {
                throw new Error("Web3 not initialized");
            }

            const owner = await window.web3Handler.contract.ownerOf(this.tokenId);
            const isOwner = owner.toLowerCase() === window.web3Handler.userAddress.toLowerCase();
            
            if (isOwner) {
                this.editSection.classList.remove('hidden');
                this.inhabitantControls.classList.remove('hidden');
                this.descriptionInput.value = this.descriptionDisplay.textContent;
                await this.loadUserInhabitants();
            }

            // Load saved inhabitant display for all users
            const savedInhabitant = localStorage.getItem(`inhabitant_${this.tokenId}`);
            if (savedInhabitant) {
                try {
                    const tokenURI = await this.inhabitantsContract.tokenURI(savedInhabitant);
                    const response = await fetch(tokenURI);
                    const nftData = await response.json();
                    this.inhabitantImage.src = nftData.image;
                    this.inhabitantImage.classList.remove('hidden');
                } catch (error) {
                    console.error("Error loading saved inhabitant:", error);
                }
            }
        } catch (error) {
            console.error("Error checking ownership:", error);
        }
    }
}

// Initialiser la page
function initializePage() {
    const page = new NFTPage();
    page.initialize();
}

// Attendre que le DOM soit chargé
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage);
} else {
    initializePage();
}