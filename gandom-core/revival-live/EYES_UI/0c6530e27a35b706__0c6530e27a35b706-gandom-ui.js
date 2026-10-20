// --- 1. Owner Authorization Logic ---
const ownerAuth = document.querySelector('#gandom-owner-auth');
if (ownerAuth) {
    const next = 'owner';
    ownerAuth.hidden = next !== 'owner';
}

// --- 2. Wallet Logic ---
const actions = { deposit: 'واریز', withdraw: 'برداشت', transfer: 'انتقال' };

document.querySelectorAll('[data-wallet-action]').forEach(btn => {
    btn.addEventListener('click', () => {
        const action = btn.dataset.walletAction;
        const amountInput = document.querySelector('#amount');
        if (amountInput) {
            const value = Number(amountInput.value);
            amountInput.focus();
            if ((action === 'transfer' || action === 'withdraw' || action === 'owner') && value > 0) {
                let count = parseInt(document.querySelector('#ledger-count')?.textContent || '0', 10) + 1;
                if(document.querySelector('#ledger-count')) document.querySelector('#ledger-count').textContent = String(count);
                const dateStr = new Date().toLocaleString('fa-IR');
                if(document.querySelector('#ledger')) {
                    document.querySelector('#ledger').textContent = `${actions[action] || 'عملیات'} | ${value} GDM | درخواست تثبیت شد | ${dateStr}`;
                }
                if(document.querySelector('#status')) {
                    document.querySelector('#status').textContent = 'پس فقط اجرای مالی قوی‌تر | درخواست تثبیت شد. کل تمام وارد و خارج مالی انجام می‌شود.';
                }
            }
        }
    });
});

// --- 3. UI Helpers ---
function nav(name, el) { if (name === "wallet") console.log("Wallet opened"); }
function showMessage(msg) { alert(msg); }
function toggle(el) { console.log("Toggled"); }
