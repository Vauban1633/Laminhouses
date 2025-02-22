// main.js
function initializeApp() {
    const connectButton = document.getElementById('connectWallet');
    const userNFTsSection = document.getElementById('userNFTs');
    const userNFTsGrid = document.getElementById('userNFTsGrid');
    const allNFTsGrid = document.getElementById('allNFTsGrid');

    // Initialisation une fois que web3Handler est disponible
    async function init() {
        // Initialize connection first
        try {
            await window.web3Handler.connect();
        } catch (error) {
            console.error("Initial connection failed:", error);
        }

        connectButton.addEventListener('click', async () => {
            try {
                const connected = await window.web3Handler.connect();
                if (connected) {
                    connectButton.textContent = 'Connected';
                    connectButton.disabled = true;
                    await loadUserNFTs();
                }
            } catch (error) {
                console.error("Connection failed:", error);
            }
        });

        async function loadUserNFTs() {
            try {
                const userNFTs = await window.web3Handler.getUserNFTs();
                if (userNFTs.length > 0) {
                    userNFTsSection.classList.remove('hidden');
                    renderNFTs(userNFTsGrid, userNFTs);
                }
            } catch (error) {
                console.error("Error loading user NFTs:", error);
                userNFTsGrid.innerHTML = '<p>Error loading your NFTs. Please try again.</p>';
            }
        }

        async function loadAllNFTs() {
            try {
                // Ensure we're connected before trying to fetch NFTs
                if (!window.web3Handler.contract) {
                    await window.web3Handler.connect();
                }
                const allNFTs = await window.web3Handler.getAllNFTs();
                renderNFTs(allNFTsGrid, allNFTs);
            } catch (error) {
                console.error("Error loading NFTs:", error);
                allNFTsGrid.innerHTML = '<p>Error loading NFTs. Please make sure you are connected to the correct network.</p>';
            }
        }

        function renderNFTs(container, nfts) {
            container.innerHTML = '';
            if (nfts.length === 0) {
                container.innerHTML = '<p>No NFTs found</p>';
                return;
            }
            nfts.forEach(nft => {
                const card = document.createElement('div');
                card.className = 'nft-card';
                card.innerHTML = `
                    <a href="nft.html?id=${nft.tokenId}">
                        <img src="${nft.image}" alt="${nft.name}" loading="lazy">
                        <div class="nft-info">
                            <h3>${nft.name}</h3>
                            <p>${nft.description || 'No description'}</p>
                        </div>
                    </a>
                `;
                container.appendChild(card);
            });
        }

        // Load initial NFTs
        await loadAllNFTs();

        // If MetaMask is already connected, update UI and load user NFTs
        if (typeof window.ethereum !== "undefined" && window.ethereum.selectedAddress) {
            connectButton.textContent = 'Connected';
            connectButton.disabled = true;
            await loadUserNFTs();
        }

        // Listen for account changes
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', async (accounts) => {
                if (accounts.length > 0) {
                    connectButton.textContent = 'Connected';
                    connectButton.disabled = true;
                    await loadUserNFTs();
                } else {
                    connectButton.textContent = 'Connect Wallet';
                    connectButton.disabled = false;
                    userNFTsSection.classList.add('hidden');
                }
                await loadAllNFTs(); // Reload all NFTs as well
            });
        }
    }

    // Vérifier si web3Handler est déjà disponible
    if (window.web3Handler) {
        init();
    } else {
        // Attendre que web3Handler soit chargé
        document.addEventListener('web3Loaded', init);
    }
}

// Attendre que le DOM soit chargé
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}