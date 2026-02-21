document.addEventListener('DOMContentLoaded', async () => {
    // جلب البيانات من السيرفر
    async function fetchData() {
        try {
            const [leadsRes, statsRes] = await Promise.all([
                fetch('/api/leads'),
                fetch('/api/stats')
            ]);
            const leadsResult = await leadsRes.json();
            const statsResult = await statsRes.json();

            if (leadsResult.success && statsResult.success) {
                updateUI(leadsResult.data, statsResult.data);
                initCharts(statsResult.data);
            }
        } catch (error) {
            console.error("خطأ في الاتصال:", error);
        }
    }

    // تحديث الأرقام والجدول
    function updateUI(leads, stats) {
        document.getElementById('totalLeads').innerText = stats.total || 0;
        document.getElementById('resLeads').innerText = stats.residential || 0;
        document.getElementById('comLeads').innerText = stats.commercial || 0;

        const tableBody = document.getElementById('adminLeadsBody');
        tableBody.innerHTML = leads.reverse().map(lead => `
            <tr class="hover:bg-white/5 transition">
                <td class="px-8 py-5">
                    <div class="font-bold text-white">${lead.name}</div>
                </td>
                <td class="px-8 py-5 font-mono text-sm">${lead.phone}</td>
                <td class="px-8 py-5">
                    <span class="${lead.type === 'Residential' ? 'text-brand-gold bg-brand-gold/10' : 'text-purple-400 bg-purple-400/10'} px-3 py-1 rounded-full text-xs font-bold">
                        ${lead.type === 'Residential' ? 'سكني' : 'تجاري'}
                    </span>
                </td>
                <td class="px-8 py-5 text-center text-xs opacity-50">
                    ${new Date(lead.date).toLocaleDateString('ar-DZ')}
                </td>
            </tr>
        `).join('');
    }

    // رسم البيانات
    function initCharts(stats) {
        // الرسم الدائري
        new Chart(document.getElementById('typeChart'), {
            type: 'doughnut',
            data: {
                labels: ['سكني', 'تجاري'],
                datasets: [{
                    data: [stats.residential || 0, stats.commercial || 0],
                    backgroundColor: ['#fbbf24', '#a78bfa'],
                    borderWidth: 0
                }]
            },
            options: { cutout: '70%', plugins: { legend: { position: 'bottom' } } }
        });

        // الرسم الخطي
        new Chart(document.getElementById('activityChart'), {
            type: 'line',
            data: {
                labels: ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'],
                datasets: [{
                    label: 'الطلبات',
                    data: [2, 5, 3, 8, stats.total || 0, 0, 0],
                    borderColor: '#fbbf24',
                    tension: 0.4,
                    fill: true,
                    backgroundColor: 'rgba(251, 191, 36, 0.05)'
                }]
            },
            options: { scales: { y: { display: false }, x: { grid: { display: false } } }, plugins: { legend: { display: false } } }
        });
    }

    fetchData();
});