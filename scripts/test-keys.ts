import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = "https://nryggqyzukuwverqrcnj.supabase.co"
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yeWdncXl6dWt1d3ZlcnFyY25qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5NzkwMjksImV4cCI6MjA5MTU1NTAyOX0.nvQ1vutad70DGCHB_n2TWGXdoaFNNtHEHkW65ILYL5Q"
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yeWdncXl6dWt1d3ZlcnFyY25qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6M31qoBtBfXtkJrzzjYyYCNuvd6fftXhTtTe5fQ.3QkbusJkILMEjC5dGUay8rTqblfVbbKjEWfMXymG1xI"

async function testKeys() {
  console.log("=== Testing ANON KEY ===")
  const anonClient = createClient(SUPABASE_URL, ANON_KEY)
  const res1 = await anonClient.from("cost_centers").select("*").limit(1)
  console.log("Anon Info:", res1.error ? res1.error.message : "Success")

  console.log("\n=== Testing SERVICE KEY ===")
  const adminClient = createClient(SUPABASE_URL, SERVICE_KEY)
  const res2 = await adminClient.from("cost_centers").select("*").limit(1)
  console.log("Service Info:", res2.error ? res2.error.message : "Success")
}

testKeys()
