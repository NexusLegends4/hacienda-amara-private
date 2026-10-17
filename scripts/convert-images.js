import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const inputDir = 'public/images';
const outputDir = 'public/images';

// Target widths for responsive images
const widths = [356, 712, 1068, 1424]; // Mobile, Tablet, Desktop, Large Desktop
const quality = 80;

async function convertImages() {
  const files = ['hacienda-amara-1.jpg', 'hacienda-amara-2.jpg', 'hacienda-amara-3.jpg'];
  
  for (const file of files) {
    const inputPath = path.join(inputDir, file);
    const baseName = path.parse(file).name;
    
    console.log(`Processing ${file}...`);
    
    // Get original image metadata
    const metadata = await sharp(inputPath).metadata();
    console.log(`  Original: ${metadata.width}x${metadata.height}`);
    
    // Generate WebP versions for each width
    for (const width of widths) {
      if (width <= metadata.width) {
        const outputName = `${baseName}-${width}w.webp`;
        const outputPath = path.join(outputDir, outputName);
        
        await sharp(inputPath)
          .resize(width, null, { withoutEnlargement: true })
          .webp({ quality })
          .toFile(outputPath);
        
        const stats = fs.statSync(outputPath);
        console.log(`  ✓ ${outputName} (${width}w) - ${(stats.size / 1024).toFixed(1)} KB`);
      }
    }
    
    // Also create a full-size optimized WebP
    const fullWebpName = `${baseName}.webp`;
    const fullWebpPath = path.join(outputDir, fullWebpName);
    await sharp(inputPath)
      .webp({ quality: 85 })
      .toFile(fullWebpPath);
    const fullStats = fs.statSync(fullWebpPath);
    console.log(`  ✓ ${fullWebpName} (full) - ${(fullStats.size / 1024).toFixed(1)} KB`);
    
    // Create AVIF version for modern browsers (smaller)
    const avifName = `${baseName}.avif`;
    const avifPath = path.join(outputDir, avifName);
    await sharp(inputPath)
      .avif({ quality: 50 })
      .toFile(avifPath);
    const avifStats = fs.statSync(avifPath);
    console.log(`  ✓ ${avifName} (full) - ${(avifStats.size / 1024).toFixed(1)} KB`);
  }
  
  console.log('\n✅ Image conversion complete!');
}

convertImages().catch(console.error);