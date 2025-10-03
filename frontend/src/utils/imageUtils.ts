
export const supportsWebP = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const webP = new Image();
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2);
    };
    webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
  });
};

let webPSupport: boolean | null = null;

export const checkWebPSupport = async (): Promise<boolean> => {
  if (webPSupport !== null) {
    return webPSupport;
  }
  webPSupport = await supportsWebP();
  return webPSupport;
};

export const getOptimizedImageUrl = async (imageUrl: string): Promise<string> => {
  const supportsWebP = await checkWebPSupport();

  return supportsWebP ? `${imageUrl}.webp` : imageUrl;
};

export const getOptimizedImageUrlSync = (imageUrl: string): string => {
  return imageUrl;
};

export const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject();
    img.src = src;
  });
};

export const preloadImages = (srcs: string[]): Promise<void[]> => {
  return Promise.all(srcs.map(preloadImage));
};
