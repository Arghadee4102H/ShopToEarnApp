document.addEventListener('DOMContentLoaded', () => {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();

    // --- Firebase Configuration ---
    // IMPORTANT: Replace with your Firebase project's configuration
    // MAKE ABSOLUTELY SURE THIS IS CORRECT!
    const firebaseConfig = {
        apiKey: "AIzaSyDdeaYdsqA-CWRy0cUaLDlAYG5cObChZRU",
        authDomain: "shoptoearnapp-23ad9.firebaseapp.com",
        projectId: "shoptoearnapp-23ad9",
        storageBucket: "shoptoearnapp-23ad9.firebasestorage.app",
        messagingSenderId: "432819509435",
        appId: "1:432819509435:web:8bbc7e24f6b27e04e8719e",
        measurementId: "YOUR_MEASUREMENT_ID" // Optional
    };

    // Global Firebase instances - will be initialized in initializeApp
    let db;
    let auth; // Though not used for TWA login, good practice

    // --- Global State & Elements ---
    let currentUser = null;
    let currentTelegramUser = null;

    const appLoader = document.getElementById('app-loader');
    const appContainer = document.getElementById('app-container');

    const sections = document.querySelectorAll('.section');
    const navButtons = document.querySelectorAll('.nav-btn');

    // Profile Elements
    const profileUsername = document.getElementById('profile-username');
    const profileTgId = document.getElementById('profile-tg-id');
    const profileEmail = document.getElementById('profile-email');
    const profileLinksCreated = document.getElementById('profile-links-created');
    const profileSuccessfulOrders = document.getElementById('profile-successful-orders');
    const profilePendingOrders = document.getElementById('profile-pending-orders');
    const profileTotalPoints = document.getElementById('profile-total-points');
    const withdrawPointsBtn = document.getElementById('withdraw-points-btn');
    const withdrawModal = document.getElementById('withdraw-modal');
    const closeModalBtn = document.querySelector('.close-button');
    const modalCurrentPoints = document.getElementById('modal-current-points');
    const withdrawAmountInput = document.getElementById('withdraw-amount');
    const withdrawMethodSelect = document.getElementById('withdraw-method');
    const withdrawDetailsInput = document.getElementById('withdraw-details');
    const submitWithdrawalBtn = document.getElementById('submit-withdrawal-btn');
    const withdrawMessage = document.getElementById('withdraw-message');

    // Shop Elements
    const productUrlInput = document.getElementById('product-url-input');
    const generateLinkBtn = document.getElementById('generate-link-btn');
    const linkGenerationMessage = document.getElementById('link-generation-message');
    const generatedLinkCard = document.getElementById('generated-link-card');
    const generatedLinkOutput = document.getElementById('generated-link-output');
    const copyLinkBtn = document.getElementById('copy-link-btn');

    // Evidence Elements
    const quickOrderIdInput = document.getElementById('quick-order-id');
    const submitQuickOrderIdBtn = document.getElementById('submit-quick-order-id-btn');
    const quickSubmitMessage = document.getElementById('quick-submit-message');
    const googleFormLinkInput = document.getElementById('google-form-link');
    const copyGformLinkBtn = document.getElementById('copy-gform-link-btn');
    const copyGformMessage = document.getElementById('copy-gform-message');

    // Transactions Elements
    const statusFilter = document.getElementById('status-filter');
    const transactionsList = document.getElementById('transactions-list');

    const AMAZON_AFFILIATE_TAG = 'arghade4102h-21';
    const EARNKARO_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2ODJjODJkNmEyMzdmM2FjYWY5Y2U5NjYiLCJlYXJua2FybyI6IjQzMTEwNjgiLCJpYXQiOjE3NTAzMDc3OTV9.6FTfh5HTXzHeGGs5wtcBXA7tBwBzAjsrwzj0zycAaOc';
    const EARNKARO_API_ENDPOINT = 'https://api.earnkaro.com/api/v1/links'; // VERIFY THIS!

    function updateLoaderMessage(message, isError = false) {
        if (appLoader) {
            const textElement = appLoader.querySelector('p');
            const spinnerElement = appLoader.querySelector('.spinner');
            if (textElement) textElement.innerHTML = message;
            if (isError && spinnerElement) {
                spinnerElement.style.borderColor = 'var(--danger-red)';
                spinnerElement.style.borderTopColor = 'var(--danger-red)';
            }
        }
        console.log(isError ? "LOADER ERROR: " : "LOADER: ", message);
    }

    // --- Initialization ---
    async function initializeApp() {
        try {
            updateLoaderMessage("Initializing Firebase...");
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
                console.log("Firebase initialized.");
            } else {
                console.log("Firebase already initialized.");
            }
            db = firebase.firestore();
            auth = firebase.auth();

            updateLoaderMessage("Connecting to Telegram...");
            if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
                currentTelegramUser = tg.initDataUnsafe.user;
                console.log("Telegram User Data:", currentTelegramUser);

                updateLoaderMessage("Fetching your profile...");
                const userRef = db.collection('users').doc(String(currentTelegramUser.id));
                const userDoc = await userRef.get();

                if (!userDoc.exists) {
                    updateLoaderMessage("New user, setting up account...");
                    currentUser = {
                        telegram_user_id: String(currentTelegramUser.id),
                        telegram_username: currentTelegramUser.username || `user_${currentTelegramUser.id}`,
                        first_name: currentTelegramUser.first_name || '',
                        last_name: currentTelegramUser.last_name || '',
                        total_points: 0,
                        links_created_count: 0,
                        successful_orders_count: 0,
                        pending_orders_count: 0,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    };
                    await userRef.set(currentUser);
                    console.log("Profile created:", currentUser);
                } else {
                    currentUser = userDoc.data();
                    console.log("Existing user profile loaded:", currentUser);
                }
                
                updateLoaderMessage("Loading app sections...");
                await loadProfileData(); // Ensure profile data is loaded before hiding loader

                appLoader.style.display = 'none';
                appContainer.style.display = 'block';
                switchSection('profile'); // Show profile section by default
                tg.HapticFeedback.notificationOccurred('success');

            } else {
                const noTgDataMsg = "Telegram user data not found.<br>Please open this app through your bot's menu button in Telegram.";
                updateLoaderMessage(noTgDataMsg, true);
                console.error("Telegram user data not available.");
                tg.HapticFeedback.notificationOccurred('error');
            }
        } catch (error) {
            console.error("Critical Error during app initialization:", error);
            let userErrorMessage = "App initialization failed. Please try again.";
            if (error.message.toLowerCase().includes("api key") || error.message.toLowerCase().includes("firebase project not found")) {
                userErrorMessage = "Firebase Configuration Error.<br>Please check your API keys and Project ID in the script.";
            } else if (error.message.toLowerCase().includes("firestore") || error.message.toLowerCase().includes("database")) {
                userErrorMessage = "Database Connection Error.<br>Check Firestore setup or network.";
            } else if (error.message.toLowerCase().includes("network request failed")) {
                userErrorMessage = "Network Error.<br>Please check your internet connection and try again.";
            } else {
                userErrorMessage = `An unexpected error occurred: ${error.message}.<br>Try refreshing.`;
            }
            updateLoaderMessage(userErrorMessage, true);
            tg.HapticFeedback.notificationOccurred('error');
        }
    }

    // --- Navigation ---
    function switchSection(targetSectionId) {
        sections.forEach(section => {
            section.classList.remove('active');
            if (section.id === targetSectionId) {
                section.classList.add('active');
            }
        });
        navButtons.forEach(button => {
            button.classList.remove('active');
            if (button.dataset.section === targetSectionId) {
                button.classList.add('active');
            }
        });

        if (targetSectionId === 'profile') loadProfileData();
        if (targetSectionId === 'transactions') loadTransactions();
        if (targetSectionId === 'shop') {
            productUrlInput.value = '';
            generatedLinkCard.style.display = 'none';
            linkGenerationMessage.style.display = 'none';
            linkGenerationMessage.textContent = '';
        }
    }

    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            switchSection(button.dataset.section);
            tg.HapticFeedback.impactOccurred('light');
        });
    });

    // --- Profile Section Logic ---
    async function loadProfileData() {
        if (!currentUser || !currentUser.telegram_user_id) {
            console.log("loadProfileData: currentUser or ID missing, skipping.");
            return;
        }
        // It's good practice to fetch fresh data if needed, or use existing `currentUser`
        // For simplicity, we'll mostly use the `currentUser` object loaded at init
        // and update it upon specific actions.
        // A fresh fetch can be added here if stale data becomes an issue.
        // const userRef = db.collection('users').doc(currentUser.telegram_user_id);
        // const doc = await userRef.get();
        // if (doc.exists) currentUser = doc.data(); else { console.error("User doc not found in loadProfileData"); return; }


        profileUsername.textContent = currentUser.telegram_username || 'N/A';
        profileTgId.textContent = currentUser.telegram_user_id;
        // profileEmail.textContent = currentUser.email || 'Not set';
        profileLinksCreated.textContent = currentUser.links_created_count || 0;
        profileSuccessfulOrders.textContent = currentUser.successful_orders_count || 0;
        profilePendingOrders.textContent = currentUser.pending_orders_count || 0;
        profileTotalPoints.textContent = currentUser.total_points || 0;
        modalCurrentPoints.textContent = currentUser.total_points || 0;
    }

    withdrawPointsBtn.addEventListener('click', () => {
        if (!currentUser || currentUser.total_points === undefined) {
             showAlert("Profile data not loaded yet. Please wait.", "error", tg); return;
        }
        if (currentUser.total_points > 0) {
            modalCurrentPoints.textContent = currentUser.total_points || 0; // Ensure modal has latest
            withdrawAmountInput.max = currentUser.total_points;
            withdrawAmountInput.value = '';
            withdrawDetailsInput.value = '';
            withdrawMethodSelect.value = '';
            withdrawMessage.textContent = '';
            withdrawMessage.style.display = 'none';
            withdrawModal.style.display = 'block';
        } else {
            showAlert("You have no points to withdraw.", "info", tg);
        }
    });

    closeModalBtn.addEventListener('click', () => {
        withdrawModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target == withdrawModal) {
            withdrawModal.style.display = 'none';
        }
    });

    submitWithdrawalBtn.addEventListener('click', async () => {
        const points = parseInt(withdrawAmountInput.value);
        const method = withdrawMethodSelect.value;
        const details = withdrawDetailsInput.value.trim();

        if (isNaN(points) || points <= 0) {
            showWithdrawMessage("Please enter a valid number of points.", "error"); return;
        }
        if (points > currentUser.total_points) {
            showWithdrawMessage("Insufficient points.", "error"); return;
        }
        if (!method) {
            showWithdrawMessage("Please select a withdrawal method.", "error"); return;
        }
        if (!details) {
            showWithdrawMessage("Please enter withdrawal details (e.g., UPI ID).", "error"); return;
        }

        submitWithdrawalBtn.disabled = true;
        submitWithdrawalBtn.textContent = 'Submitting...';
        try {
            await db.collection('withdrawals').add({
                telegram_user_id: currentUser.telegram_user_id,
                telegram_username: currentUser.telegram_username,
                points_withdrawn: points,
                method: method,
                details: details,
                status: 'Pending',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            await db.collection('users').doc(currentUser.telegram_user_id).update({
                total_points: firebase.firestore.FieldValue.increment(-points)
            });
            currentUser.total_points -= points; // Update local state

            showWithdrawMessage("Withdrawal request submitted! It will be processed soon.", "success");
            tg.HapticFeedback.notificationOccurred('success');
            loadProfileData(); // Refresh points on profile and modal
            setTimeout(() => {
                withdrawModal.style.display = 'none';
            }, 2000);

        } catch (error) {
            console.error("Error submitting withdrawal:", error);
            showWithdrawMessage("Error submitting request. Please try again.", "error");
            tg.HapticFeedback.notificationOccurred('error');
        } finally {
            submitWithdrawalBtn.disabled = false;
            submitWithdrawalBtn.textContent = 'Submit Request';
        }
    });

    function showWithdrawMessage(message, type) {
        withdrawMessage.textContent = message;
        withdrawMessage.className = `message ${type}`;
        withdrawMessage.style.display = 'block';
    }

    // --- Shop Section Logic ---
    generateLinkBtn.addEventListener('click', async () => {
        const originalUrl = productUrlInput.value.trim();
        if (!originalUrl) {
            showLinkGenerationMessage("Please paste a product URL.", "error"); return;
        }

        generatedLinkCard.style.display = 'none';
        linkGenerationMessage.className = 'message info';
        linkGenerationMessage.textContent = 'Generating link... 🤖';
        linkGenerationMessage.style.display = 'block';
        generateLinkBtn.disabled = true;
        let generatedUrl = '';
        let platform = 'Other';

        try {
            if (/(amazon\.in|amzn\.to|amazon\.com)/i.test(originalUrl)) {
                platform = 'Amazon';
                const url = new URL(originalUrl);
                const paramsToRemove = ['tag', 'ascsubtag', 'creative', 'creativeASIN', 'linkCode', 'th', 'psc'];
                paramsToRemove.forEach(param => url.searchParams.delete(param));
                url.searchParams.set('tag', AMAZON_AFFILIATE_TAG);
                generatedUrl = url.toString();
            } else if (/(flipkart\.com|dl\.flipkart\.com|myntra\.com|myntr\.it|ajio\.com|shopsy\.in|nykaa\.com)/i.test(originalUrl)) {
                if (/(flipkart\.com|dl\.flipkart\.com)/i.test(originalUrl)) platform = 'Flipkart';
                else if (/(myntra\.com|myntr\.it)/i.test(originalUrl)) platform = 'Myntra';
                else if (/(ajio\.com)/i.test(originalUrl)) platform = 'Ajio';
                else if (/(shopsy\.in)/i.test(originalUrl)) platform = 'Shopsy';
                else if (/(nykaa\.com)/i.test(originalUrl)) platform = 'Nykaa';
                else platform = 'EarnKaro_Other';

                // Ensure EARNKARO_API_ENDPOINT is correctly set and accessible
                if (!EARNKARO_API_ENDPOINT) throw new Error("EarnKaro API endpoint not configured.");

                const response = await fetch(EARNKARO_API_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${EARNKARO_API_KEY}`
                    },
                    body: JSON.stringify({ url: originalUrl })
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ message: "Unknown API error" }));
                    throw new Error(`EarnKaro API Error (${response.status}): ${errorData.message || response.statusText}`);
                }
                const data = await response.json();
                generatedUrl = data.affiliate_url || data.short_link || data.link;
                if (!generatedUrl) throw new Error("EarnKaro API did not return a valid link.");
            } else {
                showLinkGenerationMessage("Unsupported URL. Use Amazon, Flipkart, Myntra, Ajio, Shopsy, or Nykaa.", "error");
                generateLinkBtn.disabled = false;
                return;
            }

            await db.collection('generated_links').add({
                telegram_user_id: currentUser.telegram_user_id,
                telegram_username: currentUser.telegram_username,
                original_url: originalUrl,
                generated_url: generatedUrl,
                platform: platform,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            await db.collection('users').doc(currentUser.telegram_user_id).update({
                links_created_count: firebase.firestore.FieldValue.increment(1)
            });
            currentUser.links_created_count = (currentUser.links_created_count || 0) + 1;

            generatedLinkOutput.value = generatedUrl;
            generatedLinkCard.style.display = 'block';
            showLinkGenerationMessage("Affiliate link generated successfully!", "success");
            tg.HapticFeedback.notificationOccurred('success');
            loadProfileData();

        } catch (error) {
            console.error("Error generating link:", error);
            showLinkGenerationMessage(`Error: ${error.message}`, "error");
            tg.HapticFeedback.notificationOccurred('error');
        } finally {
            generateLinkBtn.disabled = false;
        }
    });

    copyLinkBtn.addEventListener('click', () => {
        generatedLinkOutput.select();
        try {
            document.execCommand('copy');
            showLinkGenerationMessage("Link copied!", "success"); // Shorter message
            tg.HapticFeedback.impactOccurred('medium');
        } catch (err) {
            showLinkGenerationMessage("Copy failed. Please copy manually.", "error");
        }
        setTimeout(() => {
            if (linkGenerationMessage.classList.contains('success')) { // Only hide success messages quickly
                 linkGenerationMessage.style.display = 'none';
                 linkGenerationMessage.textContent = '';
            }
        }, 2000);
    });

    function showLinkGenerationMessage(message, type) {
        linkGenerationMessage.textContent = message;
        linkGenerationMessage.className = `message ${type}`;
        linkGenerationMessage.style.display = 'block';
    }

    // --- Shopping Evidence Section Logic ---
    submitQuickOrderIdBtn.addEventListener('click', async () => {
        const orderId = quickOrderIdInput.value.trim();
        if (!orderId) {
            showQuickSubmitMessage("Please enter an Order ID.", "error"); return;
        }
        submitQuickOrderIdBtn.disabled = true;
        submitQuickOrderIdBtn.textContent = 'Submitting...';
        try {
            await db.collection('order_proofs').add({
                telegram_user_id: currentUser.telegram_user_id,
                telegram_username: currentUser.telegram_username,
                order_id: orderId,
                submission_type: 'quick',
                status: 'Pending',
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                points_awarded: 0
            });
            await db.collection('users').doc(currentUser.telegram_user_id).update({
                pending_orders_count: firebase.firestore.FieldValue.increment(1)
            });
            currentUser.pending_orders_count = (currentUser.pending_orders_count || 0) + 1;

            showQuickSubmitMessage("Order ID received! Complete Google Form for reward.", "success");
            quickOrderIdInput.value = '';
            tg.HapticFeedback.notificationOccurred('success');
            loadProfileData();
        } catch (error) {
            console.error("Error submitting quick Order ID:", error);
            showQuickSubmitMessage("Error submitting. Please try again.", "error");
            tg.HapticFeedback.notificationOccurred('error');
        } finally {
            submitQuickOrderIdBtn.disabled = false;
            submitQuickOrderIdBtn.textContent = 'Submit Order ID';
        }
    });

    copyGformLinkBtn.addEventListener('click', () => {
        googleFormLinkInput.select();
        try {
            document.execCommand('copy');
            showCopyGFormMessage("Google Form link copied!", "success");
            tg.HapticFeedback.impactOccurred('medium');
        } catch (err) {
             showCopyGFormMessage("Copy failed. Please copy manually.", "error");
        }
        setTimeout(() => {
            if (copyGformMessage.classList.contains('success')) {
                 copyGformMessage.style.display = 'none';
                 copyGformMessage.textContent = '';
            }
        }, 2000);
    });

    function showQuickSubmitMessage(message, type) {
        quickSubmitMessage.textContent = message;
        quickSubmitMessage.className = `message ${type}`;
        quickSubmitMessage.style.display = 'block';
    }
    function showCopyGFormMessage(message, type) {
        copyGformMessage.textContent = message;
        copyGformMessage.className = `message ${type}`;
        copyGformMessage.style.display = 'block';
    }

    // --- Transactions Section Logic ---
    async function loadTransactions() {
        if (!currentUser || !currentUser.telegram_user_id) {
             transactionsList.innerHTML = "<p>Please login or wait for profile to load.</p>";
             return;
        }
        transactionsList.innerHTML = '<div class="spinner-small" style="margin: 20px auto;"></div> <p style="text-align: center;">Loading activity...</p>';
        try {
            const selectedStatus = statusFilter.value;
            let combinedTransactions = [];

            const linksQuery = db.collection('generated_links')
                .where('telegram_user_id', '==', currentUser.telegram_user_id)
                .orderBy('timestamp', 'desc').limit(50); // Limit for performance
            const linksSnapshot = await linksQuery.get();
            linksSnapshot.forEach(doc => {
                const data = doc.data();
                combinedTransactions.push({
                    type: 'Link Generated', id: doc.id,
                    details: `Original: ${truncateString(data.original_url, 30)} <br> Generated: ${truncateString(data.generated_url, 30)}`,
                    platform: data.platform, status: 'N/A', points: 0,
                    timestamp: data.timestamp ? data.timestamp.toDate() : new Date()
                });
            });

            // For proofs, Firestore doesn't allow filtering by one field and ordering by another if not composite indexed
            // So, we fetch all for user and filter client-side, or filter by status server-side if no other order is critical
            let proofsQuery = db.collection('order_proofs')
                .where('telegram_user_id', '==', currentUser.telegram_user_id);
            // If filtering by status (and not 'all'), apply it to the query
            if (selectedStatus !== 'all') {
                proofsQuery = proofsQuery.where('status', '==', selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)); // Capitalize: Pending, Successful etc.
            }
             proofsQuery = proofsQuery.orderBy('timestamp', 'desc').limit(50);

            const proofsSnapshot = await proofsQuery.get();
            proofsSnapshot.forEach(doc => {
                const data = doc.data();
                combinedTransactions.push({
                    type: 'Order Proof', id: doc.id,
                    details: `Order ID: ${data.order_id}`, status: data.status,
                    points: data.points_awarded || 0,
                    timestamp: data.timestamp ? data.timestamp.toDate() : new Date()
                });
            });

            combinedTransactions.sort((a, b) => b.timestamp - a.timestamp);

            if (combinedTransactions.length === 0) {
                transactionsList.innerHTML = "<p>No activity yet. Start creating links or submitting proofs!</p>";
                return;
            }
            renderTransactions(combinedTransactions);
        } catch (error) {
            console.error("Error loading transactions:", error);
            transactionsList.innerHTML = "<p class='message error'>Could not load activity. Try again later.</p>";
            tg.HapticFeedback.notificationOccurred('error');
        }
    }

    function renderTransactions(transactionsData) {
        transactionsList.innerHTML = '';
        transactionsData.forEach(tx => {
            const item = document.createElement('div');
            const statusClass = tx.status ? tx.status.toLowerCase().replace(' ', '-') : 'na';
            item.className = `card transaction-item status-${statusClass}`;
            let statusEmoji = '';
            if (tx.status && tx.status !== 'N/A') {
                if (tx.status.toLowerCase() === 'pending') statusEmoji = '⏳';
                else if (tx.status.toLowerCase() === 'successful' || tx.status.toLowerCase() === 'approved') statusEmoji = '🟢';
                else if (tx.status.toLowerCase() === 'rejected') statusEmoji = '❌';
            }

            item.innerHTML = `
                <p><strong>Type:</strong> ${tx.type}</p>
                <p><strong>Details:</strong> ${tx.details}</p>
                ${tx.platform ? `<p><strong>Platform:</strong> ${tx.platform}</p>` : ''}
                ${tx.status !== 'N/A' ? `<p><strong>Status:</strong> <span class="status-tag status-${statusClass}">${statusEmoji} ${tx.status}</span></p>` : ''}
                ${tx.points > 0 ? `<p><strong>Points Earned:</strong> ${tx.points} ✨</p>` : ''}
                <p class="timestamp">${tx.timestamp.toLocaleString()}</p>
            `;
            transactionsList.appendChild(item);
        });
    }

    statusFilter.addEventListener('change', loadTransactions);

    // --- Utility Functions ---
    function showAlert(message, type = 'info', tgInstance = null) {
        // This is a placeholder. For a real app, use a styled toast/modal.
        // For now, it updates the linkGenerationMessage if it's on the shop page,
        // or a generic message if one existed, or falls back to alert.
        const activeSection = document.querySelector('.section.active');
        let msgDiv = null;
        if (activeSection && activeSection.id === 'shop') msgDiv = linkGenerationMessage;
        // else if (activeSection && activeSection.id === 'profile') msgDiv = someProfileMessageDiv; // if you add one

        if (msgDiv) {
            msgDiv.textContent = message;
            msgDiv.className = `message ${type}`;
            msgDiv.style.display = 'block';
            setTimeout(() => { if(type !== 'error') msgDiv.style.display = 'none'; }, 3000);
        } else {
            alert(`${type.toUpperCase()}: ${message}`);
        }

        if (tgInstance && tgInstance.HapticFeedback) {
            if (type === 'success') tgInstance.HapticFeedback.notificationOccurred('success');
            else if (type === 'error') tgInstance.HapticFeedback.notificationOccurred('error');
            else tgInstance.HapticFeedback.impactOccurred('light');
        }
    }

    function truncateString(str, num) {
        if (!str) return '';
        if (str.length <= num) return str;
        return str.slice(0, num) + '...';
    }

    // --- Start the app ---
    initializeApp();
});
