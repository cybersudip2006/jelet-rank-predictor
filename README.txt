# JELET Rank Predictor

Static JELET college predictor using local OR-CR cutoff data.

## Files
- `index.html` - main page
- `style.css` - design
- `script.js` - predictor logic
- `data.js` - embedded CSV fallback so local opening works
- `cutoffs.csv` - source cutoff data

## Render Deployment
Choose **Static Site**.

- Build Command: leave blank or `echo no build`
- Publish Directory: `.`

## Update Data
Replace `cutoffs.csv`, then regenerate `data.js` from the CSV if you also want local file opening to work without a server.
