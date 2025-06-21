document.addEventListener('DOMContentLoaded', () => {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand(); // Expand the web app to full height

    // --- Firebase Configuration ---
    // IMPORTANT: Replace with your Firebase project's configuration
    const firebaseConfig = {
        apiKey: "YOUR_API_KEY",
        authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
        projectId: "YOUR_PROJECT_ID",
        storageBucket: "YOUR_PROJECT_ID.appspot.com",
        messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
        appId: "YOUR_APP_ID",
        measurementId: "YOUR_MEASUREMENT_ID" // Optional
    };

    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const auth = firebase.auth(); // Though not explicitly used for user login in TWA, good to init

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
    const profileEmail = document.getElementById('profile-email'); // Placeholder
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
    // IMPORTANT: Verify this EarnKaro API Key and Endpoint!
    const EARNKARO_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2ODJjODJkNmEyMzdmM2FjYWY5Y2U5NjYiLCJlYXJua2FybyI6IjQzMTEwNjgiLCJpYXQiOjE3NTAzMDc3OTV9.6FTfh5HTXzHeGGs5wtcBXA7tBwBzAjsrwzj0zycAaOc';
    const EARNKARO_API_ENDPOINT = 'https://api.earnkaro.com/api/v1/links'; // THIS IS A GUESS - VERIFY!

    // --- Initialization ---
    async function initializeApp() {
        if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
            currentTelegramUser = tg.initDataUnsafe.user;
            console.log("Telegram User Data:", currentTelegramUser);

            const userRef = db.collection('users').doc(String(currentTelegramUser.id));
            const userDoc = await userRef.get();

            if (!userDoc.exists) {
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
            } else {
                currentUser = userDoc.data();
            }
            console.log("App User Data:", currentUser);
            tg.HapticFeedback.notificationOccurred('success');
            loadProfileData();
            loadTransactions(); // Load transactions for the initial view if it's transactions
            appLoader.style.display = 'none';
            appContainer.style.display = 'block';

        } else {
            console.error("Telegram user data not available.");
            appLoader.innerHTML = "<p>Error: Could not retrieve Telegram user data. Please open this app through Telegram.</p>";
            tg.HapticFeedback.notificationOccurred('error');
            // Potentially close the webapp or show an error message
            // tg.close();
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

        // Load data for section if needed
        if (targetSectionId === 'profile') loadProfileData();
        if (targetSectionId === 'transactions') loadTransactions();
        if (targetSectionId === 'shop') { // Reset shop section
            productUrlInput.value = '';
            generatedLinkCard.style.display = 'none';
            linkGenerationMessage.style.display = 'none';
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
        if (!currentUser) return;
        const userRef = db.collection('users').doc(currentUser.telegram_user_id);
        try {
            const doc = await userRef.get();
            if (doc.exists) {
                currentUser = doc.data(); // refresh current user data
                profileUsername.textContent = currentUser.telegram_username || 'N/A';
                profileTgId.textContent = currentUser.telegram_user_id;
                // profileEmail.textContent = currentUser.email || 'Not set'; // Email not from TG
                profileLinksCreated.textContent = currentUser.links_created_count || 0;
                profileSuccessfulOrders.textContent = currentUser.successful_orders_count || 0;
                profilePendingOrders.textContent = currentUser.pending_orders_count || 0;
                profileTotalPoints.textContent = currentUser.total_points || 0;
                modalCurrentPoints.textContent = currentUser.total_points || 0;
            }
        } catch (error) {
            console.error("Error loading profile data:", error);
            tg.HapticFeedback.notificationOccurred('error');
        }
    }

    withdrawPointsBtn.addEventListener('click', () => {
        if (currentUser.total_points > 0) {
            withdrawModal.style.display = 'block';
            withdrawAmountInput.max = currentUser.total_points;
            withdrawMessage.textContent = '';
            withdrawMessage.style.display = 'none';
        } else {
            showAlert("You have no points to withdraw.", "info", tg);
        }
    });

    closeModalBtn.addEventListener('click', () => {
        withdrawModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => { // Close modal if clicked outside
        if (event.target == withdrawModal) {
            withdrawModal.style.display = 'none';
        }
    });

    submitWithdrawalBtn.addEventListener('click', async () => {
        const points = parseInt(withdrawAmountInput.value);
        const method = withdrawMethodSelect.value;
        const details = withdrawDetailsInput.value.trim();

        if (isNaN(points) || points <= 0) {
            showWithdrawMessage("Please enter a valid number of points.", "error");
            return;
        }
        if (points > currentUser.total_points) {
            showWithdrawMessage("Insufficient points.", "error");
            return;
        }
        if (!method) {
            showWithdrawMessage("Please select a withdrawal method.", "error");
            return;
        }
        if (!details) {
            showWithdrawMessage("Please enter your withdrawal details (e.g., UPI ID, Binance ID).", "error");
            return;
        }

        try {
            submitWithdrawalBtn.disabled = true;
            submitWithdrawalBtn.textContent = 'Submitting...';

            await db.collection('withdrawals').add({
                telegram_user_id: currentUser.telegram_user_id,
                telegram_username: currentUser.telegram_username,
                points_withdrawn: points,
                method: method,
                details: details,
                status: 'Pending', // Pending ✅
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Deduct points (ideally in a transaction, but for simplicity here)
            await db.collection('users').doc(currentUser.telegram_user_id).update({
                total_points: firebase.firestore.FieldValue.increment(-points)
            });

            showWithdrawMessage("Withdrawal request submitted! It will be processed soon.", "success");
            tg.HapticFeedback.notificationOccurred('success');
            loadProfileData(); // Refresh points
            setTimeout(() => {
                withdrawModal.style.display = 'none';
                withdrawAmountInput.value = '';
                withdrawMethodSelect.value = '';
                withdrawDetailsInput.value = '';
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
            showLinkGenerationMessage("Please paste a product URL.", "error");
            return;
        }

        generatedLinkCard.style.display = 'none';
        linkGenerationMessage.style.display = 'block';
        linkGenerationMessage.className = 'message info';
        linkGenerationMessage.textContent = 'Generating link... 🤖';
        generateLinkBtn.disabled = true;

        let generatedUrl = '';
        let platform = 'Other';

        try {
            // Amazon
            if (/(amazon\.in|amzn\.to|amazon\.com)/i.test(originalUrl)) {
                platform = 'Amazon';
                const url = new URL(originalUrl);
                // Clean existing affiliate tags if any (optional, but good practice)
                const paramsToRemove = ['tag', 'ascsubtag', 'creative', 'creativeASIN', 'linkCode', 'th', 'psc'];
                paramsToRemove.forEach(param => url.searchParams.delete(param));
                
                url.searchParams.set('tag', AMAZON_AFFILIATE_TAG);
                generatedUrl = url.toString();
            }
            // Flipkart, Myntra, Ajio, Shopsy, Nykaa (via EarnKaro)
            else if (/(flipkart\.com|dl\.flipkart\.com|myntra\.com|myntr\.it|ajio\.com|shopsy\.in|nykaa\.com)/i.test(originalUrl)) {
                if (/(flipkart\.com|dl\.flipkart\.com)/i.test(originalUrl)) platform = 'Flipkart';
                else if (/(myntra\.com|myntr\.it)/i.test(originalUrl)) platform = 'Myntra';
                else if (/(ajio\.com)/i.test(originalUrl)) platform = 'Ajio';
                else if (/(shopsy\.in)/i.test(originalUrl)) platform = 'Shopsy';
                else if (/(nykaa\.com)/i.test(originalUrl)) platform = 'Nykaa';
                else platform = 'EarnKaro_Other';

                // IMPORTANT: This is a hypothetical structure for EarnKaro API call
                // You MUST verify the correct endpoint and request structure from EarnKaro docs.
                const response = await fetch(EARNKARO_API_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${EARNKARO_API_KEY}` // Common for Bearer tokens
                    },
                    body: JSON.stringify({ url: originalUrl }) // Common payload
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ message: "Unknown API error" }));
                    throw new Error(`EarnKaro API Error (${response.status}): ${errorData.message || response.statusText}`);
                }
                const data = await response.json();
                // Assuming the API returns the generated link in a property like 'affiliate_url' or 'short_link'
                generatedUrl = data.affiliate_url || data.short_link || data.link;
                if (!generatedUrl) {
                    throw new Error("EarnKaro API did not return a valid link.");
                }
            } else {
                showLinkGenerationMessage("Unsupported URL. Please use Amazon, Flipkart, Myntra, Ajio, Shopsy, or Nykaa.", "error");
                generateLinkBtn.disabled = false;
                return;
            }

            // Save to Firebase
            await db.collection('generated_links').add({
                telegram_user_id: currentUser.telegram_user_id,
                telegram_username: currentUser.telegram_username,
                original_url: originalUrl,
                generated_url: generatedUrl,
                platform: platform,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Increment user's link count
            await db.collection('users').doc(currentUser.telegram_user_id).update({
                links_created_count: firebase.firestore.FieldValue.increment(1)
            });
            if (currentUser.links_created_count !== undefined) currentUser.links_created_count++; else currentUser.links_created_count = 1;


            generatedLinkOutput.value = generatedUrl;
            generatedLinkCard.style.display = 'block';
            showLinkGenerationMessage("Affiliate link generated successfully!", "success");
            tg.HapticFeedback.notificationOccurred('success');
            loadProfileData(); // Refresh profile stats

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
        document.execCommand('copy');
        showLinkGenerationMessage("Link copied to clipboard!", "success");
        tg.HapticFeedback.impactOccurred('medium');
        setTimeout(() => {
             linkGenerationMessage.style.display = 'none';
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
            showQuickSubmitMessage("Please enter an Order ID.", "error");
            return;
        }

        try {
            submitQuickOrderIdBtn.disabled = true;
            submitQuickOrderIdBtn.textContent = 'Submitting...';

            await db.collection('order_proofs').add({
                telegram_user_id: currentUser.telegram_user_id,
                telegram_username: currentUser.telegram_username,
                order_id: orderId,
                submission_type: 'quick',
                status: 'Pending', // Pending ✅
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                points_awarded: 0 // Default
            });

            // Optionally update pending_orders_count for the user
            await db.collection('users').doc(currentUser.telegram_user_id).update({
                pending_orders_count: firebase.firestore.FieldValue.increment(1)
            });
            if (currentUser.pending_orders_count !== undefined) currentUser.pending_orders_count++; else currentUser.pending_orders_count = 1;


            showQuickSubmitMessage("Order ID received! Please complete the Google Form to process your reward.", "success");
            quickOrderIdInput.value = '';
            tg.HapticFeedback.notificationOccurred('success');
            loadProfileData(); // Refresh stats

        } catch (error) {
            console.error("Error submitting quick Order ID:", error);
            showQuickSubmitMessage("Error submitting Order ID. Please try again.", "error");
            tg.HapticFeedback.notificationOccurred('error');
        } finally {
            submitQuickOrderIdBtn.disabled = false;
            submitQuickOrderIdBtn.textContent = 'Submit Order ID';
        }
    });

    copyGformLinkBtn.addEventListener('click', () => {
        googleFormLinkInput.select();
        document.execCommand('copy');
        showCopyGFormMessage("Google Form link copied!", "success");
        tg.HapticFeedback.impactOccurred('medium');
         setTimeout(() => {
             copyGformMessage.style.display = 'none';
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
        if (!currentUser) return;
        transactionsList.innerHTML = '<div class="spinner-small"></div> <p>Loading activity...</p>';

        try {
            const selectedStatus = statusFilter.value;
            let transactions = [];

            // Fetch generated links
            const linksQuery = db.collection('generated_links')
                .where('telegram_user_id', '==', currentUser.telegram_user_id)
                .orderBy('timestamp', 'desc');
            const linksSnapshot = await linksQuery.get();
            linksSnapshot.forEach(doc => {
                const data = doc.data();
                transactions.push({
                    type: 'Link Generated',
                    id: doc.id,
                    details: `Original: ${truncateString(data.original_url, 30)} <br> Generated: ${truncateString(data.generated_url, 30)}`,
                    platform: data.platform,
                    status: 'N/A', // Links don't have status in this context, or you can add one
                    points: 0,
                    timestamp: data.timestamp.toDate()
                });
            });

            // Fetch order proofs
            let proofsQuery = db.collection('order_proofs')
                .where('telegram_user_id', '==', currentUser.telegram_user_id)
                .orderBy('timestamp', 'desc');

            const proofsSnapshot = await proofsQuery.get();
            proofsSnapshot.forEach(doc => {
                const data = doc.data();
                 // Filter by status on client-side after fetching all, or refine query if complex
                if (selectedStatus === 'all' || data.status.toLowerCase() === selectedStatus) {
                    transactions.push({
                        type: 'Order Proof',
                        id: doc.id,
                        details: `Order ID: ${data.order_id}`,
                        status: data.status, // Pending ✅ | Successful 🟢 | Rejected ❌
                        points: data.points_awarded || 0,
                        timestamp: data.timestamp.toDate()
                    });
                }
            });

            // Sort all transactions by date (newest first)
            transactions.sort((a, b) => b.timestamp - a.timestamp);


            if (transactions.length === 0) {
                transactionsList.innerHTML = "<p>No activity yet. Start creating links or submitting proofs!</p>";
                return;
            }

            renderTransactions(transactions);

        } catch (error) {
            console.error("Error loading transactions:", error);
            transactionsList.innerHTML = "<p class='message error'>Could not load activity. Try again later.</p>";
            tg.HapticFeedback.notificationOccurred('error');
        }
    }

    function renderTransactions(transactionsData) {
        transactionsList.innerHTML = ''; // Clear previous
        transactionsData.forEach(tx => {
            const item = document.createElement('div');
            item.className = `card transaction-item status-${tx.status ? tx.status.toLowerCase() : 'na'}`;
            let statusEmoji = '';
            if (tx.status) {
                if (tx.status.toLowerCase() === 'pending') statusEmoji = '⏳'; // Pending ✅ (using emoji)
                else if (tx.status.toLowerCase() === 'successful' || tx.status.toLowerCase() === 'approved') statusEmoji = '🟢';
                else if (tx.status.toLowerCase() === 'rejected') statusEmoji = '❌';
            }

            item.innerHTML = `
                <p><strong>Type:</strong> ${tx.type}</p>
                <p><strong>Details:</strong> ${tx.details}</p>
                ${tx.platform ? `<p><strong>Platform:</strong> ${tx.platform}</p>` : ''}
                ${tx.status !== 'N/A' ? `<p><strong>Status:</strong> <span class="status-tag status-${tx.status.toLowerCase()}">${statusEmoji} ${tx.status}</span></p>` : ''}
                ${tx.points > 0 ? `<p><strong>Points Earned:</strong> ${tx.points} ✨</p>` : ''}
                <p class="timestamp">${tx.timestamp.toLocaleString()}</p>
            `;
            transactionsList.appendChild(item);
        });
    }

    statusFilter.addEventListener('change', loadTransactions);

    // --- Utility Functions ---
    function showAlert(message, type = 'info', tgInstance = null) {
        // You can replace this with a more styled custom alert/toast later
        console.log(`Alert (${type}): ${message}`);
        if (tgInstance && tgInstance.HapticFeedback) {
            if (type === 'success') tgInstance.HapticFeedback.notificationOccurred('success');
            else if (type === 'error') tgInstance.HapticFeedback.notificationOccurred('error');
            else tgInstance.HapticFeedback.impactOccurred('light');
        }
        // For now, use a simple alert or a dedicated message div on the page
        // For example, update a generic message div:
        // const genericMessageDiv = document.getElementById('generic-app-message');
        // if(genericMessageDiv) {
        // genericMessageDiv.textContent = message;
        // genericMessageDiv.className = `message ${type}`;
        // genericMessageDiv.style.display = 'block';
        // setTimeout(() => genericMessageDiv.style.display = 'none', 3000);
        // } else {
        alert(message); // Fallback to browser alert
        // }
    }

    function truncateString(str, num) {
        if (str.length <= num) {
            return str;
        }
        return str.slice(0, num) + '...';
    }


    // --- Start the app ---
    initializeApp();
});