import React, { useRef, useEffect, Suspense, useState } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import {
  Box,
  OrbitControls,
  Environment,
  Sphere,
  MeshDistortMaterial,
  Stars,
  Sky,
  Sparkles,
  Cloud,
  PerspectiveCamera,
  Stats,
} from "@react-three/drei"
import { suspend } from "suspend-react"
import { MathUtils, Vector3 } from "three/src/Three"

const createAudio = async (url) => {
  // Fetch audio data and create a buffer source
  const res = await fetch(url)
  const buffer = await res.arrayBuffer()
  const context = new (window.AudioContext || window.webkitAudioContext)()
  const source = context.createBufferSource()
  source.buffer = await new Promise((res) =>
    context.decodeAudioData(buffer, res)
  )
  source.loop = true
  // This is why it doesn't run in Safari 🍏🐛. Start has to be called in an onClick event
  // which makes it too awkward for a little demo since you need to load the async data first
  source.start(0)
  // Create gain node and an analyser
  const gain = context.createGain()

  const analyser = context.createAnalyser()
  analyser.fftSize = 4096
  source.connect(analyser)
  analyser.connect(gain)

  // The data array receive the audio frequencies
  const data = new Uint8Array(analyser.frequencyBinCount)

  const connect = () => {
    try {
      gain.connect(context.destination)
    } catch (error) {
      console.log("ERRROR", error)
    }
  }

  return {
    context,
    source,
    gain,
    data,
    connect,
    // This function gets called every frame per audio source
    update: () => {
      analyser.getByteFrequencyData(data)
      // Calculate a frequency average
      return (data.avg = data
        .slice(0, 32)
        .reduce((prev, cur) => prev + cur / 32, 0))
    },
  }
}

const SONG_URL = "/pokus_2.mp3"

const EQ = () => {
  return (
    <instancedMesh>
      <meshStandardMaterial />
      {/* <meshBox */}
    </instancedMesh>
  )
}

// TODO: make it film format
const SphereVisualizer = () => {
  const sphereRef = useRef()
  const { gain, context, update, data, connect } = suspend(
    () => createAudio(SONG_URL),
    [SONG_URL]
  )

  useEffect(() => {
    // Connect the gain node, which plays the audio

    connect()
    // Disconnect it on unmount
    return () => gain.disconnect()
  }, [gain, context])

  useFrame(() => {
    let avg = update()
    // todo: clamp between max and min
    const amp = MathUtils.clamp(avg, 0, 256) / 100
    // todo: lerp
    sphereRef.current.scale.x = 1 + amp
    sphereRef.current.scale.y = 1 + amp
    sphereRef.current.scale.z = 1 + amp

    sphereRef.current.material.distort = amp * 0.5
    // sphereRef.current.material.speed = amp / 3
    // sphereRef.current.material.uniforms.
  })

  // TODO: environment with lamina render on the wobbly stuff
  // TODO: postprcessing

  return (
    <Sphere ref={sphereRef} args={[1, 100, 100]}>
      <MeshDistortMaterial
        metalness={1}
        roughness={2}
        speed={4}
        receiveShadow
        castShadow
        wireframe
      />
    </Sphere>
  )
}

const cameraClose = new Vector3(0, 0, 20)
const cameraFar = new Vector3(0, 0, 100)

const Scene = () => {
  const { camera } = useThree((state) => state.camera)
  const controlsRef = useRef(null)
  const [cameraPosition, setCameraPosition] = useState("far")
  // const cameraPosition = useRe

  // todo: use spline for camera movement
  useFrame((state) => {
    if (cameraPosition === "far") {
      controlsRef.current.position.lerp(cameraFar, 0.02)
    } else if (cameraPosition === "near") {
      controlsRef.current.position.lerp(cameraClose, 0.05)
    }
  })

  //todo: scroll closeup with camera
  // TODO: hide cursor => replace with something niece
  useEffect(() => {
    const scrollListener = (e) => {
      // TODO: scroll mrdka
      if (e.deltaY > 0) {
        setCameraPosition("near")
      } else {
        setCameraPosition("far")
      }
    }
    document.addEventListener("wheel", scrollListener)
    return () => document.removeEventListener("wheel", scrollListener)
  }, [])
  return (
    <>
      <PerspectiveCamera makeDefault ref={controlsRef} position={cameraFar} />

      <Environment>
        {/* <Stars /> */}
        <Sky />
        {/* <Cloud color="purple" /> */}
      </Environment>
      <SphereVisualizer />
      <pointLight color="red" intensity={10} />
      <color args={["#000000"]} attach="background" />
      <ambientLight />
      {/* <Cloud position={[0, 0, 10]} billboard={false} /> */}

      {/* <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry />
        <shadowMaterial transparent opacity={0.15} />
      </mesh> */}
    </>
  )
}

const Overlay = ({ setReady }) => {
  return (
    <div>
      <button onClick={() => setReady(true)}>ready pico</button>
    </div>
  )
}

const App = () => {
  const [ready, setReady] = useState(false)

  return ready ? (
    <Canvas camera={{ fov: 70, position: [0, 0, 30] }}>
      <Suspense fallback={null}>
        <Scene />
      </Suspense>
      <Stats />
    </Canvas>
  ) : (
    <Overlay setReady={setReady} />
  )
}

export default App
