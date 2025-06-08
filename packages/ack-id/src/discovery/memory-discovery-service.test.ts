import { describe, expect, test } from "vitest"
import { MemoryDiscoveryService } from "./memory-discovery-service"
import type { AgentRegistration } from "./types"

describe("MemoryDiscoveryService", () => {
  const createService = () => new MemoryDiscoveryService()
  const createAgent = (did: string): AgentRegistration => ({
    did: `did:web:${did}`,
    timestamp: Date.now(),
    capabilities: {
      protocols: ["test"],
      serviceTypes: ["test"],
      attributes: {
        test: "test"
      }
    }
  })

  test("registers and retrieves an agent", async () => {
    const service = createService()
    const agent = createAgent("example.com")

    await service.register(agent)
    const result = await service.get(agent.did)

    expect(result).toEqual(agent)
  })

  test("updates an agent registration", async () => {
    const service = createService()
    const agent = createAgent("example.com")

    await service.register(agent)
    await service.update(agent.did, {
      capabilities: {
        protocols: ["test"],
        serviceTypes: ["updated"],
        attributes: {
          test: "updated"
        }
      }
    })

    const result = await service.get(agent.did)
    expect(result).toBeDefined()
    expect(result).toMatchObject({
      capabilities: {
        protocols: ["test"],
        serviceTypes: ["updated"],
        attributes: { test: "updated" }
      }
    })
  })

  test("deregisters an agent", async () => {
    const service = createService()
    const agent = createAgent("example.com")

    await service.register(agent)
    await service.deregister(agent.did)

    const result = await service.get(agent.did)
    expect(result).toBeUndefined()
  })

  test("discovers agents by protocol", async () => {
    const service = createService()
    const agent1 = createAgent("example1.com")
    const agent2 = createAgent("example2.com")
    agent2.capabilities.protocols = ["other"]

    await service.register(agent1)
    await service.register(agent2)

    const result = await service.discover({ protocols: ["test"] })
    expect(result.total).toBe(1)
    expect(result.agents[0]).toEqual(agent1)
  })

  test("discovers agents by service type", async () => {
    const service = createService()
    const agent1 = createAgent("example1.com")
    const agent2 = createAgent("example2.com")
    agent2.capabilities.serviceTypes = ["other"]

    await service.register(agent1)
    await service.register(agent2)

    const result = await service.discover({ serviceTypes: ["test"] })
    expect(result.total).toBe(1)
    expect(result.agents[0]).toEqual(agent1)
  })

  test("discovers agents by attribute", async () => {
    const service = createService()
    const agent1 = createAgent("example1.com")
    const agent2 = createAgent("example2.com")
    agent2.capabilities.attributes = { test: "other" }

    await service.register(agent1)
    await service.register(agent2)

    const result = await service.discover({
      attributes: { test: "test" }
    })
    expect(result.total).toBe(1)
    expect(result.agents[0]).toEqual(agent1)
  })
})
