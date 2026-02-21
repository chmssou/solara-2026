document.addEventListener('DOMContentLoaded', () => {
    // 1. تشغيل الأنميشن
    AOS.init({ duration: 1000, once: true });

    // 2. إخفاء شاشة التحميل
    const preloader = document.getElementById('preloader');
    if (preloader) {
        setTimeout(() => preloader.style.opacity = '0', 500);
        setTimeout(() => preloader.remove(), 1000);
    }

    // 3. تحديث قيمة الفاتورة على الشاشة
    const billInput = document.getElementById('billInput');
    const billDisplay = document.getElementById('billDisplay');
    billInput.addEventListener('input', (e) => {
        billDisplay.innerText = e.target.value;
    });

    // 4. نظام التنقل بين الخطوات (Stepper)
    const nextButtons = document.querySelectorAll('.next-btn');
    nextButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const nextStepId = btn.getAttribute('data-next');
            showStep(nextStepId);
            if (nextStepId == "2") renderChart(); // رسم البياني عند الوصول للخطوة 2
            if (nextStepId == "3") runScientificCalculation();
        });
    });

    function showStep(stepNum) {
        document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
        document.getElementById(`step-${stepNum}`).classList.add('active');
        document.querySelectorAll('.step-dot').forEach((dot, idx) => {
            dot.classList.toggle('active', idx + 1 == stepNum);
        });
    }

    // 5. رسم البياني (Chart.js)
    function renderChart() {
        const ctx = document.getElementById('savingsChart').getContext('2d');
        if (window.myChart) window.myChart.destroy(); // حذف القديم لتجنب التداخل

        window.myChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['السنة 1', 'السنة 5', 'السنة 10', 'السنة 20'],
                datasets: [{
                    label: 'توفيرك المالي (دج)',
                    data: [0, billInput.value * 60, billInput.value * 120, billInput.value * 240],
                    borderColor: '#f59e0b',
                    tension: 0.4,
                    fill: true,
                    backgroundColor: 'rgba(245, 158, 11, 0.1)'
                }]
            }
        });
    }

    // 6. الحسابات العلمية
    function runScientificCalculation() {
        const bill = parseFloat(billInput.value);
        const panels = Math.ceil(bill / 500); // معادلة تجريبية سريعة
        document.getElementById('panelCount').innerText = panels;
        // هنا يمكنك إضافة بقية الـ IDs (المساحة، التوفير السنوي...)
    }
});