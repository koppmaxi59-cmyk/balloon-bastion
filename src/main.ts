import './styles.css';
import { startGame } from './game';

startGame(document.getElementById('app')!);

if ('serviceWorker' in navigator) {
	window.addEventListener('load', () => {
		navigator.serviceWorker.register('./sw.js').catch(() => undefined);
	});
}
