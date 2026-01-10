import JSZip from "jszip";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const QUADRANT_VECTORS = {
    NORTH: { x: -1, z: 0 },
    NNW: { x: -0.924, z: 0.383 },
    NW: { x: -0.707, z: 0.707 },
    WNW: { x: -0.383, z: 0.924 },
    WEST: { x: 0, z: 1 },
};

const BALL_NUMBER = "01";
const FRAMES_PER_ROTATION = 9;
const FRAME_SIZE = 256;
const COLUMNS = 4;

const ThreeScene = () => {
    const mountRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const ballRef = useRef<THREE.Group | null>(null);

    const [progress, setProgress] = useState("");

    useEffect(() => {
        if (!mountRef.current) return;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true,
        });

        renderer.setSize(FRAME_SIZE, FRAME_SIZE);
        renderer.outputColorSpace = THREE.SRGBColorSpace;

        rendererRef.current = renderer;
        sceneRef.current = scene;
        cameraRef.current = camera;

        mountRef.current.appendChild(renderer.domElement);

        // Lighting setup
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.8);
        scene.add(ambientLight);

        const mainLight = new THREE.DirectionalLight(0xffffff, 3.5);
        mainLight.position.set(5, 10, 10);
        camera.add(mainLight);
        scene.add(camera);

        const textureLoader = new THREE.TextureLoader();
        const customTexture = textureLoader.load("/ASSETS_TO_NOT_SHIP/3dball/textures/Material_40_baseColor.jpeg");
        customTexture.flipY = false;
        customTexture.wrapS = THREE.RepeatWrapping;
        customTexture.wrapT = THREE.RepeatWrapping;

        const loader = new GLTFLoader();
        loader.load("/ASSETS_TO_NOT_SHIP/3dball/ball.gltf", (gltf) => {
            const ball = gltf.scene;
            ball.scale.set(0.5, 0.5, 0.5);
            ball.rotation.set(1.5, 0, 0);

            ball.traverse((node) => {
                if ((node as THREE.Mesh).isMesh) {
                    const material = (node as THREE.Mesh).material as THREE.MeshStandardMaterial;
                    material.roughness = 0.15;
                    material.metalness = 0.4;
                    material.map = customTexture;
                }
            });
            ballRef.current = ball;
            scene.add(ball);
        });

        camera.position.z = 20.5;
        const orbitControls = new OrbitControls(camera, renderer.domElement);

        const animate = () => {
            requestAnimationFrame(animate);
            orbitControls.update();
            renderer.render(scene, camera);
        };
        animate();

        return () => {
            mountRef.current?.removeChild(renderer.domElement);
        };
    }, []);

    const generateAndZipSheets = async () => {
        if (!ballRef.current || !rendererRef.current || !sceneRef.current || !cameraRef.current) return;

        const zip = new JSZip();
        const ball = ballRef.current;
        const renderer = rendererRef.current;
        const directions = Object.entries(QUADRANT_VECTORS);
        const textureLoader = new THREE.TextureLoader();

        //  for (const [dirName, axis] of directions) {
        const NUM_BALLS = 16;

        for (let ballIdx = 0; ballIdx < NUM_BALLS; ballIdx++) {
            const texturePath = `/ASSETS_TO_NOT_SHIP/3dball/textures/Material_${25 + ballIdx}_baseColor.jpeg`;

            setProgress(`Loading Texture: ${ballIdx + 1}/${NUM_BALLS}`);

            const newTexture = await textureLoader.loadAsync(texturePath);
            newTexture.flipY = false;
            newTexture.colorSpace = THREE.SRGBColorSpace;
            newTexture.wrapS = THREE.RepeatWrapping;
            newTexture.wrapT = THREE.RepeatWrapping;

            ball.traverse((node) => {
                if ((node as THREE.Mesh).isMesh) {
                    const material = (node as THREE.Mesh).material as THREE.MeshStandardMaterial;
                    material.roughness = 0.15;
                    material.metalness = 0.4;
                    material.map = newTexture;
                }
            });

            const dirName = "NORTH";
            const axis = QUADRANT_VECTORS[dirName]!;
            const sheetCanvas = document.createElement("canvas");
            sheetCanvas.width = COLUMNS * FRAME_SIZE;
            sheetCanvas.height = (COLUMNS / 2) * FRAME_SIZE;
            const ctx = sheetCanvas.getContext("2d");

            if (!ctx) return;

            for (let i = 0; i < FRAMES_PER_ROTATION; i++) {
                setProgress(`Ball ${ballIdx + 1} - ${dirName}: Frame ${i + 1}/${FRAMES_PER_ROTATION}`);

                ball.rotation.set(1.5, 0, 0);
                ball.updateMatrixWorld();

                const angle = (i / FRAMES_PER_ROTATION) * Math.PI * 2;
                const frameRotation = new THREE.Euler(axis.x * angle, 0, axis.z * angle);
                ball.quaternion.multiply(new THREE.Quaternion().setFromEuler(frameRotation));
                ball.updateMatrixWorld();

                renderer.render(sceneRef.current, cameraRef.current);

                const x = (i % COLUMNS) * FRAME_SIZE;
                const y = Math.floor(i / COLUMNS) * FRAME_SIZE;
                ctx.drawImage(renderer.domElement, x, y);

                if (i % 8 === 0) await new Promise((r) => setTimeout(r, 1));
            }

            const blob = await new Promise<Blob | null>((resolve) => sheetCanvas.toBlob(resolve, "image/png"));

            if (blob) {
                zip.file(`ball_${ballIdx}_${dirName}_sheet.png`, blob);
            }

            newTexture.dispose();
        }
        setProgress("Creating ZIP archive...");
        const content = await zip.generateAsync({ type: "blob" });

        const link = document.createElement("a");
        link.href = URL.createObjectURL(content!);
        link.download = `ball_${BALL_NUMBER}_directional_sheets.zip`;
        link.click();

        setProgress("Done! Zip downloaded.");
    };

    return (
        <div style={{ position: "relative", backgroundColor: "#111", height: "100vh" }}>
            <div style={{ position: "absolute", zIndex: 10, padding: "20px", color: "white" }}>
                <button
                    onClick={generateAndZipSheets}
                    style={{
                        padding: "14px 28px",
                        cursor: "pointer",
                        fontSize: "16px",
                        background: "#8e44ad",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        fontWeight: "bold",
                        boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
                    }}
                >
                    Download Zipped Sprite Sheets
                </button>
                <p style={{ marginTop: "12px", color: "#3498db", fontWeight: "500" }}>{progress}</p>
            </div>
            <div
                ref={mountRef}
                style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}
            />
        </div>
    );
};

export default ThreeScene;
