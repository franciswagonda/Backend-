const fs = require('fs');
const PNG = require('pngjs').PNG;
const path = require('path');

const imagePath = path.join(__dirname, '../client/src/assets/sign-in.png');

fs.createReadStream(imagePath)
    .pipe(new PNG())
    .on('parsed', function () {
        const colorCounts = {};
        const totalPixels = this.width * this.height;

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const idx = (this.width * y + x) << 2;
                const r = this.data[idx];
                const g = this.data[idx + 1];
                const b = this.data[idx + 2];
                // Ignore alpha for now, or skip transparent
                const a = this.data[idx + 3];
                if (a < 128) continue;

                const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
                colorCounts[hex] = (colorCounts[hex] || 0) + 1;
            }
        }

        const sortedColors = Object.entries(colorCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10);

        console.log('Top 10 Colors:');
        sortedColors.forEach(([color, count]) => {
            const percentage = ((count / totalPixels) * 100).toFixed(2);
            console.log(`${color}: ${percentage}%`);
        });
    })
    .on('error', (err) => {
        console.error('Error parsing PNG:', err);
    });
