document.addEventListener('DOMContentLoaded', function() {
    // DOM elementlerini seç
    const fileInput = document.getElementById('fileInput');
    const uploadButton = document.getElementById('uploadButton');
    const previewContainer = document.getElementById('previewContainer');
    const resultsContainer = document.getElementById('resultsContainer');
    const loadingSpinner = document.getElementById('loadingSpinner');

    // Desteklenen dosya türleri
    const supportedImageTypes = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    const supportedPdfTypes = ['.pdf'];
    const supportedFileTypes = [...supportedImageTypes, ...supportedPdfTypes];

    // Dosya seçildiğinde önizleme göster
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        
        // Dosya türünü kontrol et
        if (!supportedFileTypes.includes(fileExtension)) {
            showError(`Desteklenmeyen dosya türü: ${fileExtension}. Desteklenen türler: ${supportedFileTypes.join(', ')}`);
            return;
        }

        // Önizleme göster
        showPreview(file);
    });

    // Yükle ve analiz et butonuna tıklandığında
    uploadButton.addEventListener('click', function() {
        const file = fileInput.files[0];
        if (!file) {
            showError('Lütfen bir dosya seçin.');
            return;
        }

        // Dosyayı yükle ve analiz et
        uploadAndAnalyze(file);
    });

    // Dosya önizlemesini göster
    function showPreview(file) {
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        const reader = new FileReader();

        previewContainer.innerHTML = '';

        if (supportedImageTypes.includes(fileExtension)) {
            reader.onload = function(e) {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.alt = 'Yüklenen görüntü';
                img.className = 'img-fluid';
                previewContainer.appendChild(img);
            };
            reader.readAsDataURL(file);
        } else if (supportedPdfTypes.includes(fileExtension)) {
            reader.onload = function(e) {
                const iframe = document.createElement('iframe');
                iframe.src = e.target.result;
                iframe.width = '100%';
                iframe.height = '400px';
                previewContainer.appendChild(iframe);
            };
            reader.readAsDataURL(file);
        }
    }

    // Dosyayı yükle ve analiz et
    async function uploadAndAnalyze(file) {
        try {
            // Yükleme başladı
            loadingSpinner.classList.remove('d-none');
            resultsContainer.innerHTML = '<p class="text-muted">Analiz yapılıyor, lütfen bekleyin...</p>';

            // Dosyayı Base64'e dönüştür
            const base64Content = await fileToBase64(file);
            const fileExtension = '.' + file.name.split('.').pop().toLowerCase();

            // API isteği için veri hazırla
            const requestData = {
                messages: [
                    {
                        role: 'user',
                        content: `Bu grafiği analiz edebilir misin? Dosya türü: ${fileExtension}`
                    }
                ],
                tools: [
                    {
                        name: 'analyze-graph',
                        parameters: {
                            fileContent: base64Content,
                            fileType: fileExtension,
                            referenceUrls: [
                                'https://r-graph-gallery.com/web-double-ridgeline-plot.html',
                                'https://dreamrs.github.io/esquisse/',
                                'https://www.data-to-viz.com/#boxplot'
                            ]
                        }
                    }
                ]
            };

            // API isteği gönder
            const response = await fetch('/api/agents/graphAnalyzerAgent/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                throw new Error(`API hatası: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            
            // Sonuçları göster
            displayResults(result);
        } catch (error) {
            console.error('Hata:', error);
            showError(`Analiz sırasında bir hata oluştu: ${error.message}`);
        } finally {
            // Yükleme bitti
            loadingSpinner.classList.add('d-none');
        }
    }

    // Dosyayı Base64'e dönüştür
    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
    }

    // Sonuçları göster
    function displayResults(result) {
        if (!result || !result.text) {
            showError('Analiz sonuçları alınamadı.');
            return;
        }

        resultsContainer.innerHTML = `<div class="analysis-content">${formatAnalysisText(result.text)}</div>`;
    }

    // Analiz metnini formatla
    function formatAnalysisText(text) {
        // Markdown benzeri formatlamayı HTML'e dönüştür
        return text
            .replace(/## (.*)/g, '<h3 class="mt-4">$1</h3>')
            .replace(/\n- (.*)/g, '<li>$1</li>')
            .replace(/\n\n/g, '</ul><p>')
            .replace(/<li>/g, '<ul><li>')
            .replace(/<\/p><ul>/g, '<ul>')
            .replace(/<\/ul><\/ul>/g, '</ul>')
            .replace(/\n/g, '<br>');
    }

    // Hata mesajı göster
    function showError(message) {
        resultsContainer.innerHTML = `<div class="error-message">${message}</div>`;
    }
});
