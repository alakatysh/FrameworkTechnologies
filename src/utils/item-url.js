export const buildPublicImageUrl = (request, imagePath) => {
  if (!imagePath) {
    return null;
  }

  const normalizedPath = imagePath.startsWith('/uploads/')
    ? imagePath
    : `/uploads${imagePath.startsWith('/') ? imagePath : `/${imagePath}`}`;
  const host = request.host ?? request.headers?.host ?? 'localhost';

  return `${request.protocol}://${host}${normalizedPath}`;
};

export const normalizeStoredImagePath = (imagePath) => {
  if (!imagePath) {
    return null;
  }

  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    try {
      const url = new URL(imagePath);
      const pathname = url.pathname;

      return pathname.startsWith('/uploads/')
        ? pathname.slice('/uploads'.length)
        : pathname;
    } catch {
      return null;
    }
  }

  if (imagePath.startsWith('/uploads/')) {
    return imagePath.slice('/uploads'.length);
  }

  return imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
};

export const toPublicItem = (request, item) => ({
  ...item,
  image: buildPublicImageUrl(request, item.image),
});

export const toPublicItems = (request, items) =>
  items.map((item) => toPublicItem(request, item));
