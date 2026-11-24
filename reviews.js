/* AlbumStudio PRO Customer Reviews
 * GitHub Pages frontend -> cPanel PHP API (private JSON storage).
 * Change REVIEW_API_URL if you use a different cPanel API address.
 */
(() => {
    'use strict';

    const REVIEW_API_URL = 'https://addguru.xyz/albumstudio/reviews/reviews.php';
    const form = document.getElementById('customerReviewForm');
    const list = document.getElementById('reviewsList');
    const summary = document.getElementById('reviewSummary');
    const status = document.getElementById('reviewFormStatus');
    const submitButton = document.getElementById('submitReviewButton');
    const starPicker = document.getElementById('reviewStarPicker');
    const ratingInput = document.getElementById('reviewRating');

    if (!form || !list || !summary || !status || !submitButton || !starPicker || !ratingInput) {
        console.error('AlbumStudio PRO Reviews: required review elements were not found.');
        return;
    }

    let selectedRating = Math.min(5, Math.max(1, Number(ratingInput.value) || 5));

    function setStatus(message, kind = 'info') {
        status.textContent = message;
        status.className = 'text-sm ' + (kind === 'success'
            ? 'text-green-400'
            : kind === 'error'
                ? 'text-red-400'
                : 'text-gray-300');
    }

    function paintStars() {
        starPicker.querySelectorAll('[data-rating]').forEach((button) => {
            const value = Number(button.getAttribute('data-rating'));
            const active = value <= selectedRating;
            button.classList.toggle('text-yellow-400', active);
            button.classList.toggle('text-gray-600', !active);
            button.setAttribute('aria-pressed', active && value === selectedRating ? 'true' : 'false');
        });
        ratingInput.value = String(selectedRating);
    }

    starPicker.addEventListener('click', (event) => {
        const button = event.target.closest('[data-rating]');
        if (!button) return;
        selectedRating = Number(button.getAttribute('data-rating'));
        paintStars();
    });

    starPicker.addEventListener('keydown', (event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        if (event.key === 'ArrowLeft') selectedRating = Math.max(1, selectedRating - 1);
        if (event.key === 'ArrowRight') selectedRating = Math.min(5, selectedRating + 1);
        if (event.key === 'Home') selectedRating = 1;
        if (event.key === 'End') selectedRating = 5;
        paintStars();
        const active = starPicker.querySelector(`[data-rating="${selectedRating}"]`);
        if (active) active.focus();
    });

    function makeText(tag, className, value) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        element.textContent = value == null ? '' : String(value);
        return element;
    }

    function formatDate(value) {
        if (!value) return '';
        const date = new Date(String(value).replace(' ', 'T'));
        if (Number.isNaN(date.getTime())) return '';
        return new Intl.DateTimeFormat('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric'
        }).format(date);
    }

    function renderReviews(reviews) {
        list.replaceChildren();

        if (!Array.isArray(reviews) || reviews.length === 0) {
            list.appendChild(makeText('p', 'text-gray-400 text-sm', 'No approved reviews yet. Be the first to share your experience.'));
            return;
        }

        reviews.forEach((review) => {
            const card = document.createElement('article');
            card.className = 'rounded-xl border border-gray-800 bg-[#111827]/70 p-4';

            const top = document.createElement('div');
            top.className = 'flex flex-wrap items-start justify-between gap-2';

            const identity = document.createElement('div');
            identity.appendChild(makeText('h4', 'font-bold text-white', review.name || 'Customer'));
            if (review.studio) identity.appendChild(makeText('p', 'text-xs text-gray-400 mt-0.5', review.studio));
            top.appendChild(identity);

            const meta = document.createElement('div');
            meta.className = 'text-right';
            const rating = Math.min(5, Math.max(0, Number(review.rating) || 0));
            meta.appendChild(makeText('div', 'text-yellow-400 tracking-wider', '★'.repeat(rating) + '☆'.repeat(5 - rating)));
            const date = formatDate(review.created_at);
            if (date) meta.appendChild(makeText('div', 'text-xs text-gray-500 mt-1', date));
            top.appendChild(meta);

            card.appendChild(top);
            card.appendChild(makeText('p', 'text-sm leading-6 text-gray-300 mt-3 whitespace-pre-wrap break-words', review.message || ''));
            list.appendChild(card);
        });
    }

    async function loadReviews() {
        summary.textContent = 'Loading reviews...';
        list.replaceChildren(makeText('p', 'text-gray-400 text-sm', 'Loading customer reviews...'));

        try {
            const response = await fetch(`${REVIEW_API_URL}?action=list`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                cache: 'no-store'
            });
            const data = await response.json();
            if (!response.ok || data.status !== 'success') {
                throw new Error(data.message || 'Could not load reviews.');
            }

            const count = Number(data.summary?.count || 0);
            const average = Number(data.summary?.average || 0);
            summary.textContent = count
                ? `${average.toFixed(1)} / 5 ★ · ${count} review${count === 1 ? '' : 's'}`
                : 'No reviews yet';
            renderReviews(data.reviews || []);
        } catch (error) {
            summary.textContent = 'Reviews unavailable';
            list.replaceChildren(makeText(
                'p',
                'text-amber-300 text-sm',
                'Reviews could not be loaded. The review service may still be setting up. Please try again later.'
            ));
            console.error('AlbumStudio PRO Reviews API:', error);
        }
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        setStatus('Submitting your review...', 'info');
        submitButton.disabled = true;
        submitButton.classList.add('opacity-60', 'cursor-not-allowed');

        const payload = {
            name: document.getElementById('reviewName')?.value.trim() || '',
            studio: document.getElementById('reviewStudio')?.value.trim() || '',
            rating: selectedRating,
            message: document.getElementById('reviewMessage')?.value.trim() || '',
            website: document.getElementById('reviewWebsite')?.value.trim() || ''
        };

        try {
            const response = await fetch(`${REVIEW_API_URL}?action=submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload),
                cache: 'no-store'
            });
            const data = await response.json();
            if (!response.ok || data.status !== 'success') {
                throw new Error(data.message || 'Your review could not be submitted.');
            }

            form.reset();
            selectedRating = 5;
            paintStars();
            setStatus(data.message || 'Thank you! Your review has been submitted and will appear after approval.', 'success');
            await loadReviews();
        } catch (error) {
            setStatus(error.message || 'Could not connect to the review service. Please try again.', 'error');
            console.error('AlbumStudio PRO Review Submit:', error);
        } finally {
            submitButton.disabled = false;
            submitButton.classList.remove('opacity-60', 'cursor-not-allowed');
        }
    });

    paintStars();
    loadReviews();
})();
