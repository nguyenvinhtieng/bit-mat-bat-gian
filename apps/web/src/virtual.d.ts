declare module 'virtual:asset-list' {
  /** hash of every asset's path+size+mtime — names the Cache Storage bucket */
  export const version: string;
  export const files: { url: string; size: number }[];
}
