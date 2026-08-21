"use client"

import { useState } from "react"
import { useCRM } from "@/contexts/crm-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MessageSquare, Send, Clock, CheckCircle, AlertCircle, Plus, Edit, Trash2 } from "lucide-react"

interface WhatsAppTemplate {
  id: string
  name: string
  message: string
  type: "renewal" | "payment" | "general"
  variables: string[]
}

interface WhatsAppCampaign {
  id: string
  name: string
  templateId: string
  recipients: number
  status: "draft" | "scheduled" | "sent" | "failed"
  scheduledDate?: string
  sentDate?: string
}

export function WhatsAppContent() {
  const { renewalReminders } = useCRM()
  const [activeTab, setActiveTab] = useState("automation")
  const [whatsappSettings, setWhatsappSettings] = useState({
    apiKey: "",
    phoneNumber: "",
    autoRenewalReminders: true,
    reminderDaysBefore: 7,
    businessHoursOnly: true,
    startTime: "09:00",
    endTime: "18:00",
  })

  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([
    {
      id: "1",
      name: "Renewal Reminder",
      message:
        "Hi {{customerName}}, your {{serviceName}} subscription expires on {{expiryDate}}. Please renew to continue enjoying our services. Reply RENEW to proceed.",
      type: "renewal",
      variables: ["customerName", "serviceName", "expiryDate"],
    },
    {
      id: "2",
      name: "Payment Due",
      message:
        "Hello {{customerName}}, your payment of ${{amount}} for {{serviceName}} is due on {{dueDate}}. Please make the payment to avoid service interruption.",
      type: "payment",
      variables: ["customerName", "amount", "serviceName", "dueDate"],
    },
  ])

  const [campaigns, setCampaigns] = useState<WhatsAppCampaign[]>([
    {
      id: "1",
      name: "Monthly Renewal Reminders",
      templateId: "1",
      recipients: 45,
      status: "sent",
      sentDate: "2024-01-15T10:00:00Z",
    },
    {
      id: "2",
      name: "Payment Overdue Notices",
      templateId: "2",
      recipients: 12,
      status: "scheduled",
      scheduledDate: "2024-01-20T09:00:00Z",
    },
  ])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "bg-green-100 text-green-800 border-green-200"
      case "scheduled":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "failed":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "scheduled":
        return <Clock className="h-4 w-4 text-blue-500" />
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <MessageSquare className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">WhatsApp Automation</h1>
          <p className="text-muted-foreground">Manage automated WhatsApp messages and campaigns</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Campaign
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Automation Tab */}
        <TabsContent value="automation" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Reminders</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{renewalReminders.length}</div>
                <p className="text-xs text-muted-foreground">Scheduled reminders</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
                <Send className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1,234</div>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">98.5%</div>
                <p className="text-xs text-muted-foreground">Delivery success</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Upcoming Renewal Reminders</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Reminder Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {renewalReminders.slice(0, 5).map((reminder) => (
                    <TableRow key={reminder.id}>
                      <TableCell className="font-medium">{reminder.customerName}</TableCell>
                      <TableCell>{reminder.serviceName}</TableCell>
                      <TableCell>{new Date(reminder.expiryDate).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(reminder.reminderDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(reminder.status)}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(reminder.status)}
                            {reminder.status.charAt(0).toUpperCase() + reminder.status.slice(1)}
                          </div>
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Message Templates</CardTitle>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {templates.map((template) => (
                  <Card key={template.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{template.name}</h3>
                            <Badge variant="outline">
                              {template.type.charAt(0).toUpperCase() + template.type.slice(1)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{template.message}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Variables:</span>
                            {template.variables.map((variable) => (
                              <Badge key={variable} variant="secondary" className="text-xs">
                                {`{{${variable}}}`}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>WhatsApp Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign Name</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => {
                    const template = templates.find((t) => t.id === campaign.templateId)
                    return (
                      <TableRow key={campaign.id}>
                        <TableCell className="font-medium">{campaign.name}</TableCell>
                        <TableCell>{template?.name || "Unknown"}</TableCell>
                        <TableCell>{campaign.recipients}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getStatusColor(campaign.status)}>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(campaign.status)}
                              {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                            </div>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {campaign.sentDate
                            ? new Date(campaign.sentDate).toLocaleDateString()
                            : campaign.scheduledDate
                              ? new Date(campaign.scheduledDate).toLocaleDateString()
                              : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>WhatsApp API Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    value={whatsappSettings.apiKey}
                    onChange={(e) => setWhatsappSettings((prev) => ({ ...prev, apiKey: e.target.value }))}
                    placeholder="Enter your WhatsApp API key"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Business Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    value={whatsappSettings.phoneNumber}
                    onChange={(e) => setWhatsappSettings((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                    placeholder="+1234567890"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Automation Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto Renewal Reminders</Label>
                  <p className="text-sm text-muted-foreground">Automatically send renewal reminders to customers</p>
                </div>
                <Switch
                  checked={whatsappSettings.autoRenewalReminders}
                  onCheckedChange={(checked) =>
                    setWhatsappSettings((prev) => ({ ...prev, autoRenewalReminders: checked }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reminderDays">Reminder Days Before Expiry</Label>
                <Select
                  value={whatsappSettings.reminderDaysBefore.toString()}
                  onValueChange={(value) =>
                    setWhatsappSettings((prev) => ({ ...prev, reminderDaysBefore: Number.parseInt(value) }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="3">3 days</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Business Hours Only</Label>
                  <p className="text-sm text-muted-foreground">Send messages only during business hours</p>
                </div>
                <Switch
                  checked={whatsappSettings.businessHoursOnly}
                  onCheckedChange={(checked) =>
                    setWhatsappSettings((prev) => ({ ...prev, businessHoursOnly: checked }))
                  }
                />
              </div>

              {whatsappSettings.businessHoursOnly && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={whatsappSettings.startTime}
                      onChange={(e) => setWhatsappSettings((prev) => ({ ...prev, startTime: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime">End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={whatsappSettings.endTime}
                      onChange={(e) => setWhatsappSettings((prev) => ({ ...prev, endTime: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              <Button className="w-full">Save Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
