import React, { useRef, useEffect, Suspense, useState } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { Box, OrbitControls, Sphere } from "@react-three/drei"
import { suspend } from "suspend-react"

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
  analyser.fftSize = 256
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
        .slice(0, 10)
        .reduce((prev, cur) => prev + cur / data.length, 0))
    },
  }
}

const SONG_URL = "/pokus_2.mp3"

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
    sphereRef.current.scale.x = avg / 15
  })

  useFrame((state, delta) => {})
  return (
    <Sphere ref={sphereRef} args={[1]}>
      <meshStandardMaterial />
    </Sphere>
  )
}

const Scene = () => {
  return (
    <>
      <SphereVisualizer />
      <ambientLight />
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
    <Canvas camera={{ fov: 70, position: [0, 0, 3] }}>
      <OrbitControls />
      <Suspense fallback={null}>
        <Scene />
      </Suspense>
      <mesh
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.025, 0]}
      >
        <planeGeometry />
        <shadowMaterial transparent opacity={0.15} />
      </mesh>
    </Canvas>
  ) : (
    <Overlay setReady={setReady} />
  )
}

export default App
