'use client'

import { useState, useEffect } from 'react'
import { getServiceUrl } from '../utils/endpoint-utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Switch } from './ui/switch'
import { Slider } from './ui/slider'
import { Textarea } from './ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog'
import {
  Shield,
  Users,
  DollarSign,
  Clock,
  Settings,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react'

interface AgentPolicies {
  requireCatenaICC: boolean
  maxTransactionSize: number
  dailyTransactionLimit: number
  trustedAgents?: string[]
}

interface Agent {
  did: string
  name: string
  role: 'requestor' | 'executor'
  policies: AgentPolicies
  status: 'active' | 'inactive' | 'suspended'
  lastActivity: Date
  transactionsToday: number
  dailyVolume: number
}

interface PolicyTemplate {
  id: string
  name: string
  description: string
  policies: AgentPolicies
}

interface TransactionLog {
  id: string
  timestamp: Date
  fromAgent: string
  toAgent: string
  amount: number
  token: string
  status: 'completed' | 'failed' | 'pending'
  policyViolations?: string[]
}

const POLICY_TEMPLATES: PolicyTemplate[] = [
  {
    id: 'conservative',
    name: 'Conservative',
    description: 'Low limits with strict identity requirements',
    policies: {
      requireCatenaICC: true,
      maxTransactionSize: 1000,
      dailyTransactionLimit: 5000,
      trustedAgents: []
    }
  },
  {
    id: 'moderate',
    name: 'Moderate',
    description: 'Balanced security and usability',
    policies: {
      requireCatenaICC: false,
      maxTransactionSize: 10000,
      dailyTransactionLimit: 50000,
      trustedAgents: []
    }
  },
  {
    id: 'permissive',
    name: 'Permissive',
    description: 'High limits for trusted environments',
    policies: {
      requireCatenaICC: false,
      maxTransactionSize: 100000,
      dailyTransactionLimit: 1000000,
      trustedAgents: []
    }
  }
]

export function PolicyManager() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [isModified, setIsModified] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [newTrustedAgent, setNewTrustedAgent] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const [transactionLogs, setTransactionLogs] = useState<TransactionLog[]>([
    {
      id: '1',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      fromAgent: 'Alice (Requestor)',
      toAgent: 'Bob (Executor)',
      amount: 60000,
      token: 'USDC',
      status: 'completed',
      policyViolations: []
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
      fromAgent: 'Alice (Requestor)',
      toAgent: 'Bob (Executor)',
      amount: 120000,
      token: 'USDC',
      status: 'failed',
      policyViolations: ['Exceeds maximum transaction size']
    }
  ])

  const ACK_LAB_URL = getServiceUrl(5680)

  // Load agents from ACK-Lab on component mount
  useEffect(() => {
    loadAgents()
  }, [])

  const loadAgents = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${ACK_LAB_URL}/agents`)
      if (response.ok) {
        const agentData = await response.json()
        const formattedAgents = agentData.map((data: { did: string, policies: AgentPolicies }) => {
          // Convert URL-encoded DID to readable format for display
          const displayDid = data.did.replace(/%3A/g, ':')
          return {
            did: displayDid,
            name: data.did.includes('5678') ? 'Alice (Requestor)' : 'Bob (Executor)',
            role: data.did.includes('5678') ? 'requestor' : 'executor',
            policies: data.policies,
            status: 'active' as const,
            lastActivity: new Date(),
            transactionsToday: Math.floor(Math.random() * 10),
            dailyVolume: Math.floor(Math.random() * 500000)
          }
        })
        setAgents(formattedAgents)
        if (formattedAgents.length > 0) {
          setSelectedAgent(formattedAgents[0])
        }
      }
    } catch (error) {
      console.error('Failed to load agents:', error)
      // Fall back to mock data
      const mockAgents = [
        {
          did: 'did:web:alice.example.com',
          name: 'Alice (Requestor)',
          role: 'requestor' as const,
          policies: {
            requireCatenaICC: false,
            maxTransactionSize: 100000000,
            dailyTransactionLimit: 1000000000,
            trustedAgents: []
          },
          status: 'active' as const,
          lastActivity: new Date(),
          transactionsToday: 3,
          dailyVolume: 180000
        },
        {
          did: 'did:web:bob.example.com',
          name: 'Bob (Executor)',
          role: 'executor' as const,
          policies: {
            requireCatenaICC: false,
            maxTransactionSize: 100000000,
            dailyTransactionLimit: 1000000000,
            trustedAgents: []
          },
          status: 'active' as const,
          lastActivity: new Date(),
          transactionsToday: 3,
          dailyVolume: 180000
        }
      ]
      setAgents(mockAgents)
      setSelectedAgent(mockAgents[0])
    } finally {
      setIsLoading(false)
    }
  }

  const handlePolicyChange = (field: keyof AgentPolicies, value: boolean | number | string[]) => {
    if (!selectedAgent) return

    const updatedAgent = {
      ...selectedAgent,
      policies: {
        ...selectedAgent.policies,
        [field]: value
      }
    }

    setSelectedAgent(updatedAgent)
    setAgents(agents.map(a => a.did === selectedAgent.did ? updatedAgent : a))
    setIsModified(true)
  }

  const handleApplyTemplate = (template: PolicyTemplate) => {
    if (!selectedAgent) return

    const updatedAgent = {
      ...selectedAgent,
      policies: { ...template.policies }
    }

    setSelectedAgent(updatedAgent)
    setAgents(agents.map(a => a.did === selectedAgent.did ? updatedAgent : a))
    setIsModified(true)
  }

  const handleSavePolicies = async () => {
    if (!selectedAgent || isSaving) return

    try {
      setIsSaving(true)

      // The DID might be in display format (localhost:port) but we need to match
      // the stored format (localhost%3Aport) before URL encoding for the API
      let didForApi = selectedAgent.did
      if (didForApi.includes('localhost:')) {
        // Convert display format back to stored format
        didForApi = didForApi.replace(/localhost:(\d+)/, 'localhost%3A$1')
      }
      // Then URL encode the entire DID for the API path
      const encodedDid = encodeURIComponent(didForApi)

      console.log('Saving policies for DID:', selectedAgent.did, '-> encoded as:', encodedDid)

      const response = await fetch(`${ACK_LAB_URL}/agents/${encodedDid}/policies`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(selectedAgent.policies)
      })

      if (response.ok) {
        setIsModified(false)
        console.log('Policies saved successfully for', selectedAgent.did)
      } else {
        const errorText = await response.text()
        console.error('Failed to save policies:', response.status, errorText)
        throw new Error(`Failed to save policies: ${response.status}`)
      }
    } catch (error) {
      console.error('Failed to save policies:', error)
      // In a real app, show error notification
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetPolicies = () => {
    if (!selectedAgent) return

    // Reload from server
    loadAgents()
    setIsModified(false)
  }

  const addTrustedAgent = () => {
    if (!selectedAgent || !newTrustedAgent.trim()) return

    const currentTrusted = selectedAgent.policies.trustedAgents || []
    if (currentTrusted.includes(newTrustedAgent)) return

    handlePolicyChange('trustedAgents', [...currentTrusted, newTrustedAgent])
    setNewTrustedAgent('')
  }

  const removeTrustedAgent = (agentDid: string) => {
    if (!selectedAgent) return

    const currentTrusted = selectedAgent.policies.trustedAgents || []
    handlePolicyChange('trustedAgents', currentTrusted.filter(did => did !== agentDid))
  }

  const getStatusIcon = (status: Agent['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'inactive':
        return <XCircle className="w-4 h-4 text-gray-400" />
      case 'suspended':
        return <AlertTriangle className="w-4 h-4 text-red-500" />
    }
  }

  const getTransactionStatusIcon = (status: TransactionLog['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount / 1000000) // Convert from subunits
  }

  const getRiskLevel = (policies: AgentPolicies) => {
    let riskScore = 0

    if (!policies.requireCatenaICC) riskScore += 2
    if (policies.maxTransactionSize > 50000000000) riskScore += 3 // > $50k
    if (policies.dailyTransactionLimit > 500000000000) riskScore += 3 // > $500k
    if ((policies.trustedAgents?.length || 0) === 0) riskScore += 1

    if (riskScore <= 2) return { level: 'Low', color: 'text-green-600 bg-green-100' }
    if (riskScore <= 5) return { level: 'Medium', color: 'text-yellow-600 bg-yellow-100' }
    return { level: 'High', color: 'text-red-600 bg-red-100' }
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6 flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600" />
          <p className="text-muted-foreground">Loading agents and policies...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="w-8 h-8 text-blue-600" />
            ACK-Lab Policy Manager
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage agent policies and monitor transaction compliance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isModified ? 'destructive' : 'secondary'}>
            {isModified ? 'Modified' : 'Saved'}
          </Badge>
          {isModified && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleResetPolicies}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
              <Button onClick={handleSavePolicies} disabled={isSaving}>
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Agent List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Agents
            </CardTitle>
            <CardDescription>Select an agent to manage policies</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {agents.map(agent => (
              <div
                key={agent.did}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedAgent?.did === agent.did
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedAgent(agent)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-sm">{agent.name}</div>
                  {getStatusIcon(agent.status)}
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>Role: {agent.role}</div>
                  <div>Transactions: {agent.transactionsToday}/day</div>
                  <div>Volume: {formatCurrency(agent.dailyVolume)}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Policy Configuration */}
        <div className="lg:col-span-3 space-y-6">
          {selectedAgent && (
            <>
              {/* Agent Overview */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{selectedAgent.name}</CardTitle>
                      <CardDescription className="font-mono text-xs mt-1">
                        {selectedAgent.did}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getRiskLevel(selectedAgent.policies).color}>
                        {getRiskLevel(selectedAgent.policies).level} Risk
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {selectedAgent.role}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Tabs defaultValue="policies" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="policies">Policies</TabsTrigger>
                  <TabsTrigger value="templates">Templates</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>

                <TabsContent value="policies" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        Security Policies
                      </CardTitle>
                      <CardDescription>
                        Configure security and transaction limits for this agent
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Identity Requirements */}
                      <div className="space-y-3">
                        <Label className="text-base font-medium">Identity Requirements</Label>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="catena-icc"
                            checked={selectedAgent.policies.requireCatenaICC}
                            onCheckedChange={(checked) => handlePolicyChange('requireCatenaICC', checked)}
                          />
                          <Label htmlFor="catena-icc">Require Catena ICC credential</Label>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          When enabled, counterparties must present a valid Catena-issued Identity Compliance Certificate
                        </p>
                      </div>

                      {/* Transaction Limits */}
                      <div className="space-y-4">
                        <Label className="text-base font-medium">Transaction Limits</Label>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="max-transaction">Maximum Transaction Size</Label>
                            <span className="text-sm font-mono">
                              {formatCurrency(selectedAgent.policies.maxTransactionSize)}
                            </span>
                          </div>
                          <Slider
                            id="max-transaction"
                            min={1000000} // $1
                            max={1000000000} // $1M
                            step={1000000} // $1
                            value={[selectedAgent.policies.maxTransactionSize]}
                            onValueChange={([value]) => handlePolicyChange('maxTransactionSize', value)}
                            className="w-full"
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="daily-limit">Daily Transaction Limit</Label>
                            <span className="text-sm font-mono">
                              {formatCurrency(selectedAgent.policies.dailyTransactionLimit)}
                            </span>
                          </div>
                          <Slider
                            id="daily-limit"
                            min={1000000} // $1
                            max={10000000000} // $10M
                            step={1000000} // $1
                            value={[selectedAgent.policies.dailyTransactionLimit]}
                            onValueChange={([value]) => handlePolicyChange('dailyTransactionLimit', value)}
                            className="w-full"
                          />
                        </div>
                      </div>

                      {/* Trusted Agents */}
                      <div className="space-y-3">
                        <Label className="text-base font-medium">Trusted Agents</Label>
                        <p className="text-sm text-muted-foreground">
                          Agents in this list bypass certain policy restrictions
                        </p>

                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter DID (e.g., did:web:example.com)"
                            value={newTrustedAgent}
                            onChange={(e) => setNewTrustedAgent(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addTrustedAgent()}
                          />
                          <Button onClick={addTrustedAgent} size="sm">
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>

                        {selectedAgent.policies.trustedAgents && selectedAgent.policies.trustedAgents.length > 0 && (
                          <div className="space-y-2">
                            {selectedAgent.policies.trustedAgents.map(agentDid => (
                              <div key={agentDid} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <span className="font-mono text-sm">{agentDid}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeTrustedAgent(agentDid)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Advanced Settings */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                          >
                            {showAdvanced ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
                          </Button>
                        </div>

                        {showAdvanced && (
                          <div className="p-4 border rounded-lg space-y-4">
                            <div className="space-y-2">
                              <Label>Custom Policy JSON</Label>
                              <Textarea
                                value={JSON.stringify(selectedAgent.policies, null, 2)}
                                onChange={(e) => {
                                  try {
                                    const policies = JSON.parse(e.target.value)
                                    setSelectedAgent({ ...selectedAgent, policies })
                                    setIsModified(true)
                                  } catch (error) {
                                    // Invalid JSON, ignore
                                  }
                                }}
                                rows={8}
                                className="font-mono text-sm"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="templates" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Policy Templates</CardTitle>
                      <CardDescription>
                        Apply pre-configured policy templates to quickly set up common configurations
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {POLICY_TEMPLATES.map(template => (
                        <div key={template.id} className="p-4 border rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{template.name}</h4>
                              <p className="text-sm text-muted-foreground">{template.description}</p>
                            </div>
                            <Button onClick={() => handleApplyTemplate(template)}>
                              Apply
                            </Button>
                          </div>
                          <div className="text-xs space-y-1 text-muted-foreground">
                            <div>Catena ICC Required: {template.policies.requireCatenaICC ? 'Yes' : 'No'}</div>
                            <div>Max Transaction: {formatCurrency(template.policies.maxTransactionSize)}</div>
                            <div>Daily Limit: {formatCurrency(template.policies.dailyTransactionLimit)}</div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="activity" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Transaction Activity</CardTitle>
                      <CardDescription>
                        Recent transactions and policy enforcement events
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>From</TableHead>
                            <TableHead>To</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Violations</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {transactionLogs.map(log => (
                            <TableRow key={log.id}>
                              <TableCell className="font-mono text-xs">
                                {log.timestamp.toLocaleTimeString()}
                              </TableCell>
                              <TableCell className="text-sm">{log.fromAgent}</TableCell>
                              <TableCell className="text-sm">{log.toAgent}</TableCell>
                              <TableCell className="font-mono">
                                {formatCurrency(log.amount)} {log.token}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {getTransactionStatusIcon(log.status)}
                                  <span className="capitalize text-sm">{log.status}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {log.policyViolations && log.policyViolations.length > 0 ? (
                                  <div className="space-y-1">
                                    {log.policyViolations.map((violation, i) => (
                                      <Badge key={i} variant="destructive" className="text-xs">
                                        {violation}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">None</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
