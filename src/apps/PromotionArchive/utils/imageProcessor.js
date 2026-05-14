/**
 * 이미지를 규격에 맞게 크롭하고 최적화하는 엔진 (ArrayBuffer 방식)
 * 메모리 누수 방지를 위해 처리 후 캔버스를 즉시 파괴합니다.
 */
export const processAndCropImage = async (file, isMobile) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const arrayBuffer = e.target.result;
      const blob = new Blob([arrayBuffer], { type: file.type });
      const url = URL.createObjectURL(blob);

      const img = new Image();
      img.onload = () => {
        const targetW = isMobile ? 750 : 1920;
        const targetH = img.height;

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error("Canvas context 생성 실패"));
          return;
        }

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        let sourceX = 0;
        let sourceW = img.width;

        if (img.width > targetW) {
          sourceX = (img.width - targetW) / 2;
          sourceW = targetW;
        }

        ctx.drawImage(
          img,
          sourceX, 0, sourceW, targetH,
          (targetW - sourceW) / 2, 0, sourceW, targetH
        );

        const thumbW = 800;
        const thumbH = (targetH * thumbW) / targetW;
        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = thumbW;
        thumbCanvas.height = thumbH;
        const thumbCtx = thumbCanvas.getContext('2d');
        thumbCtx.imageSmoothingEnabled = true;
        thumbCtx.imageSmoothingQuality = 'high';
        thumbCtx.drawImage(canvas, 0, 0, thumbW, thumbH);

        const results = {
          thumbnail: thumbCanvas.toDataURL('image/jpeg', 0.85),
          detail: canvas.toDataURL('image/jpeg', 0.90)
        };

        // ✨ 메모리 해제: URL 및 객체 참조 파기
        URL.revokeObjectURL(url);
        canvas.width = 0;
        canvas.height = 0;
        thumbCanvas.width = 0;
        thumbCanvas.height = 0;
        img.src = '';

        resolve(results);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("이미지 데이터를 읽을 수 없습니다."));
      };

      img.src = url;
    };

    reader.readAsArrayBuffer(file);
  });
};