var SAND = SAND || {};

SAND.Global = (function (window, document, undefined) {

    var self = {

        "init": function () {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('./sw.js');
            }

            var sandDom = '\
                <div id="sandcontainer">\
                <canvas id="sand" width="500" height="500"></canvas>\
                </div>';
            var sandDom2 = '\
                <div id="sandcontainer2">\
                <splash class="btn" enabled></splash>\
                <button class="btn" enabled></button>\
                <button1 class="btn" enabled></button1>\
                <button2 class="btn" enabled></button2>\
                <button3 class="btn" enabled></button3>\
                </div>';

            if ($('#sandcontaier').length > 0) {
                $('#sandcontainer').remove();
            }

            $(document.body).append(sandDom);
            $(document.body).append(sandDom2);
            self.sandbox();
        },

        "sandbox": function () {

            // get the canvas element and its context
            var splash = document.querySelector('splash'),
                canvascontainer = document.getElementById('sandcontainer'),
                canvas = document.getElementById('sand'),
                ctx = canvas.getContext('2d'),
                img = document.getElementById('sand'), //document.createElement('IMG'),
                stamp = document.createElement('IMG'),
                tile = document.createElement('IMG'),
                shadows = document.createElement('IMG'),
                popupCopy = {},
                button = document.querySelector('button'),
                button1 = document.querySelector('button1'),
                button2 = document.querySelector('button2'),
                button3 = document.querySelector('button3'),
                params = {
                    maxRadius: 8, // PB 10
                    radiusWobble: 0.02,
                    numPuffs: 20,
                    puffSpread: 7,
                    puffRadius: 5,
                    puffAlpha: 0.30,
                    inertia: 0.6,
                    shadowAlpha: 0.6
                },
                drawingExists = false;
            ctx.canvas.width = window.innerWidth;
            ctx.canvas.height = window.innerHeight;
            var tmr = window.setTimeout(function () {
                if (document.body.requestFullscreen) {
                    document.body.requestFullscreen();
                } else if (document.body.msRequestFullscreen) {
                    document.body.msRequestFullscreen();
                } else if (document.body.mozRequestFullScreen) {
                    document.body.mozRequestFullScreen();
                } else if (document.body.webkitRequestFullscreen) {
                    document.body.webkitRequestFullscreen();
                }
                splash.hidden = true;
                clearCanvas();
            }, 5000); // hide Splash screen after 2.5 seconds
            splash.onclick = function (e) {
                clearTimeout(tmr);
                if (document.body.requestFullscreen) {
                    document.body.requestFullscreen();
                } else if (document.body.msRequestFullscreen) {
                    document.body.msRequestFullscreen();
                } else if (document.body.mozRequestFullScreen) {
                    document.body.mozRequestFullScreen();
                } else if (document.body.webkitRequestFullscreen) {
                    document.body.webkitRequestFullscreen();
                }
                splash.hidden = true;
                clearCanvas();
            }

            $("#sandcontainer").addClass("shown");

            stamp.src = 'Images/dust.png';
            tile.src = 'Images/tile.jpg';
            shadows.src = 'Images/shadows.png';
            var tilePat = null;
            tile.onload = function () {
                tilePat = ctx.createPattern(tile, 'repeat');
            };

            var mousePos = [0, 0];
            var mouseDown = false;
            var radius = 0; // radius of trench
            var angle = 0; // angle of mouse motion
            var rWander = 5; // outer radius of puffs of sand

            var fore = 0;
            var back = 0;
            var brushsize = 0;
            fore = parseInt(localStorage.getItem("SandBox.foreground")) || 0;
            back = parseInt(localStorage.getItem("SandBox.background")) || 0;
            brushsize = parseInt(localStorage.getItem("SandBox.brushsize")) || 0;
            setHues();
            setSize();

            // move a toward b by fraction x
            function lerp(a, b, x) {
                return (1 - x) * a + x * b;
            }

            function drawStamp(x, y, angle, alpha) {
                // draw semi-circle of puffs around trench
                ctx.globalAlpha = params.puffAlpha;
                var numPuffs = Math.floor(params.numPuffs);
                for (var i = 0; i < numPuffs; ++i) {
                    var r = Math.random() * rWander;
                    var theta = angle + Math.PI * (Math.random() - 0.5);
                    var dx = (r + radius) * Math.cos(theta);
                    var dy = (r + radius) * Math.sin(theta);
                    var q = 2 + Math.random() * params.puffRadius;
                    ctx.drawImage(stamp, x + dx - 0.5 * q, y + dy - 0.5 * q, q, q);
                }

                // draw the trench
                ctx.globalAlpha = 0.12;
                ctx.globalAlpha = 1;
                ctx.fillStyle = tilePat;
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, 2 * Math.PI);
                ctx.closePath();
                ctx.fill();

                // shadow
                var shadowIndex = (128 * angle / Math.PI) & 0xff;
                var tx = (shadowIndex & 15) * 32;
                var ty = (shadowIndex >> 4) * 32;
                ctx.globalAlpha = alpha ? alpha : params.shadowAlpha;
                var radius2 = radius * 1.05;
                // using 28,28 to cut off the dark overlap from next door
                ctx.drawImage(shadows, tx, ty, 28, 28, x - radius2, y - radius2, 2 * radius2, 2 * radius2);

                // update values for randomness
                radius = lerp(radius, params.maxRadius * (1 + (Math.random() - 0.5)), params.radiusWobble);
                rWander = lerp(rWander, 3 + Math.random() * params.puffRadius, 0.2);
            }

            function resize() {
                ctx.canvas.width = window.innerWidth;
                ctx.canvas.height = window.innerHeight;
            }

            function getEventPos(e) {
                if (e.touches) {
                    var touch = e.touches[0];
                    // console.log(touch.pageY, touch.clientY);
                    return [touch.clientX, touch.clientY];
                } else {
                    return [e.clientX, e.clientY];
                }
            }

            // erases all drawn content from the <canvas>es
            function clearCanvas() {
                canvas.width = canvas.width;
                ctx.drawImage(img, 0, 0);
                drawingExists = false;
            }

            function startDrawing(e) {
                // set trench radius to 0 to start from a point
                radius = 0.5 * params.maxRadius;
                rWander = 0;
                mousePos = getEventPos(e);
                mouseDown = true;
                drawStamp(mousePos[0], mousePos[1], 0.25);

                // prevent drag &drop
                e.preventDefault();
            }

            function moveDrawing(e) {
                if (mouseDown) {
                    var lerpAmount = Math.pow(1 - params.inertia, 2);
                    var newMousePos = getEventPos(e);
                    newMousePos[0] = lerp(mousePos[0], newMousePos[0], lerpAmount);
                    newMousePos[1] = lerp(mousePos[1], newMousePos[1], lerpAmount);

                    // direction and angle of mouse
                    var dx = newMousePos[0] - mousePos[0];
                    var dy = newMousePos[1] - mousePos[1];

                    var angle = 0;
                    if (dx !== 0 && dy !== 0)
                        angle = Math.atan2(dy, dx);

                    var dist = Math.sqrt(dx * dx + dy * dy);
                    var stepSize = 2;
                    var numSteps = Math.floor(dist / stepSize);

                    var ddx = dx / numSteps;
                    var ddy = dy / numSteps;

                    for (var i = 0; i < numSteps; ++i) {
                        mousePos[0] += ddx;
                        mousePos[1] += ddy;
                        drawStamp(mousePos[0], mousePos[1], angle);
                    }
                }
            }

            function endDrawing(e) {
                mouseDown = false;
                var newMousePos = getEventPos(e);
                var dx = newMousePos[0] - mousePos[0];
                var dy = newMousePos[1] - mousePos[1];
                var angle = Math.atan2(dy, dx);
                drawStamp(mousePos[0], mousePos[1], angle, 0.55);
            }

            var audio;

            function PlaySound(s) {
                if (audio != undefined)
                    audio.pause();
                s = "Sounds/" + s;
                try {
                    audio = new Audio(s);
                    audio.play();
                    console.log('Sound: ' + s);
                } catch (e) {};
            }

            function setHues() {
                if (back < 350)
                    canvascontainer.style.filter = "hue-rotate(" + back % 360 + "deg)";
                else
                    canvascontainer.style.filter = "invert(100%) hue-rotate(" + back % 360 + "deg)";
                if (fore < 350)
                    canvas.style.filter = "brightness(70%) hue-rotate(" + fore % 360 + "deg)";
                else
                    canvas.style.filter = "hue-rotate(" + fore % 360 + "deg)";
            }

            function foreground(e) {
                fore += 30;
                if (fore > 700)
                    fore = 0;
                e.preventDefault();
                PlaySound("fore.mp3");
                setHues();
                localStorage.setItem("SandBox.foreground", fore);
            }

            function background(e) {
                e.preventDefault();
                PlaySound("back.mp3");
                back += 40;
                if (back > 700)
                    back = 0;
                setHues();
                localStorage.setItem("SandBox.background", back);
            }

            function clear(e) {
                e.preventDefault();
                PlaySound("clear.mp3")
                clearCanvas();
            }

            function setSize() {
                switch (brushsize) {
                    case 0:
                        params.maxRadius = 5;
                        break;
                    case 1:
                        params.maxRadius = 8;
                        break;
                    case 2:
                        params.maxRadius = 12;
                        break;
                    case 3:
                        params.maxRadius = 16;
                        break;
                    default:
                        params.maxRadius = 5;
                        break;

                }
            }

            function size(e) {
                e.preventDefault();
                PlaySound("size.mp3")
                brushsize++;
                if (brushsize > 3)
                    brushsize = 0;
                localStorage.setItem("SandBox.brushsize", brushsize);
                setSize();
            }

            canvas.addEventListener('touchstart', startDrawing);
            canvas.addEventListener('touchmove', moveDrawing);
            canvas.addEventListener('touchend', endDrawing);
            canvas.addEventListener('mousedown', startDrawing);
            canvas.addEventListener('mousemove', moveDrawing);
            canvas.addEventListener('mouseup', endDrawing);
            window.addEventListener('resize', resize);

            button.addEventListener('mousedown', foreground);
            button1.addEventListener('mousedown', background);
            button2.addEventListener('mousedown', clear);
            button3.addEventListener('mousedown', size);


            // prevent elastic scrolling
            //uses document because document will be topmost level in bubbling
            $("#sandcontainer").on('touchmove', function (e) {
                e.preventDefault();
            });

            //uses body because jquery on events are called off of the element they are added to, so bubbling would not work if we used document instead.
            $("#sandcontainer").on('touchstart', '.scrollable', function (e) {
                if (e.currentTarget.scrollTop === 0) {
                    e.currentTarget.scrollTop = 1;
                } else if (e.currentTarget.scrollHeight === e.currentTarget.scrollTop + e.currentTarget.offsetHeight) {
                    e.currentTarget.scrollTop -= 1;
                }
            });

            //prevents preventDefault from being called on document if it sees a scrollable div
            $("#sandcontainer").on('touchmove', '.scrollable', function (e) {
                e.stopPropagation();
            });
        }
    };


    return self;
}(this, this.document));
