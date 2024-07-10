let wavesurfer;
let audioContext;
let audioBuffer;

document.addEventListener('DOMContentLoaded', function() {
    wavesurfer = WaveSurfer.create({
        container: '#waveform',
        waveColor: '#3498db',
        progressColor: '#2980b9',
        cursorColor: '#2c3e50',
        barWidth: 3,
        barRadius: 3,
        cursorWidth: 1,
        height: 128,
        barGap: 2,
        responsive: true,
        plugins: [
            WaveSurfer.timeline.create({
                container: "#wave-timeline",
                primaryColor: '#2c3e50',
                secondaryColor: '#2c3e50',
                primaryFontColor: '#2c3e50',
                secondaryFontColor: '#2c3e50'
            }),
            WaveSurfer.cursor.create({
                showTime: true,
                opacity: 1,
                customShowTimeStyle: {
                    'background-color': '#000',
                    color: '#fff',
                    padding: '2px',
                    'font-size': '10px'
                }
            })
        ]
    });

    const audioInput = document.getElementById('audioInput');
    const playPauseButton = document.getElementById('playPause');
    const cutButton = document.getElementById('cut');
    const downloadMP3Button = document.getElementById('downloadMP3');
    const durationDisplay = document.getElementById('duration');
    const cutResult = document.getElementById('cutResult');
    const timePosition = document.getElementById('time-position');

    audioInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        wavesurfer.loadBlob(file);
        
        const reader = new FileReader();
        reader.onload = function(event) {
            const arrayBuffer = event.target.result;
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            audioContext.decodeAudioData(arrayBuffer, function(buffer) {
                audioBuffer = buffer;
                downloadMP3Button.disabled = false;
            });
        };
        reader.readAsArrayBuffer(file);
    });

    wavesurfer.on('ready', function() {
        const duration = wavesurfer.getDuration();
        durationDisplay.textContent = `Durée totale: ${formatTime(duration)} s`;
    });

    wavesurfer.on('seek', function(progress) {
        const currentTime = wavesurfer.getCurrentTime();
        timePosition.textContent = `Position : ${formatTime(currentTime)} s`;
    });

    wavesurfer.on('audioprocess', function() {
        const currentTime = wavesurfer.getCurrentTime();
        timePosition.textContent = `Position : ${formatTime(currentTime)} s`;
    });

    playPauseButton.addEventListener('click', function() {
        wavesurfer.playPause();
    });

    cutButton.addEventListener('click', function() {
        const startTime = parseFloat(document.getElementById('startTime').value);
        const endTime = parseFloat(document.getElementById('endTime').value);
        
        if (isNaN(startTime) || isNaN(endTime) || startTime >= endTime || endTime > audioBuffer.duration) {
            alert('Veuillez entrer des valeurs valides pour le temps de début et de fin.');
            return;
        }

        const frameCount = Math.floor((endTime - startTime) * audioBuffer.sampleRate);
        const newBuffer = audioContext.createBuffer(audioBuffer.numberOfChannels, frameCount, audioBuffer.sampleRate);

        for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
            const oldData = audioBuffer.getChannelData(channel);
            const newData = newBuffer.getChannelData(channel);
            for (let i = 0; i < frameCount; i++) {
                newData[i] = oldData[Math.floor(startTime * audioBuffer.sampleRate) + i];
            }
        }

        audioBuffer = newBuffer;
        wavesurfer.loadDecodedBuffer(audioBuffer);

        wavesurfer.on('ready', function() {
            const newDuration = wavesurfer.getDuration();
            durationDisplay.textContent = `Nouvelle durée: ${formatTime(newDuration)} s`;
        });

        cutResult.textContent = `Audio coupé de ${formatTime(startTime)} s à ${formatTime(endTime)} s`;
        downloadMP3Button.disabled = false;
    });

    downloadMP3Button.addEventListener('click', function() {
        if (audioBuffer) {
            const mp3Data = [];
            const mp3Encoder = new lamejs.Mp3Encoder(audioBuffer.numberOfChannels, audioBuffer.sampleRate, 128);
            const sampleBlockSize = 1152;

            for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
                const samples = audioBuffer.getChannelData(channel);
                const samplesLength = samples.length;
                
                for (let i = 0; i < samplesLength; i += sampleBlockSize) {
                    const sampleChunk = samples.subarray(i, Math.min(i + sampleBlockSize, samplesLength));
                    const mp3buf = mp3Encoder.encodeBuffer(convertFloat32ToInt16(sampleChunk));
                    if (mp3buf.length > 0) {
                        mp3Data.push(mp3buf);
                    }
                }
            }

            const mp3buf = mp3Encoder.flush();
            if (mp3buf.length > 0) {
                mp3Data.push(mp3buf);
            }

            const blob = new Blob(mp3Data, {type: 'audio/mp3'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.style.display = "none";
            a.href = url;
            a.download = "audio_edite.mp3";
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } else {
            alert("Aucun audio à télécharger. Veuillez d'abord charger un fichier audio.");
        }
    });
});

function formatTime(timeInSeconds) {
    return timeInSeconds.toFixed(3);
}

function convertFloat32ToInt16(buffer) {
    const l = buffer.length;
    const buf = new Int16Array(l);
    while (l--) {
        buf[l] = Math.min(1, buffer[l]) * 0x7FFF;
    }
    return buf;
}