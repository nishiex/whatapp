"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Edit, Trash2 } from "lucide-react"

interface MessageTemplateDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function MessageTemplateDialog({ isOpen, onClose }: MessageTemplateDialogProps) {
  const [templates, setTemplates] = useState([
    {
      id: "1",
      name: "30 Day Reminder",
      type: "reminder",
      subject: "Service Renewal Reminder - 30 Days",
      message:
        "Hi {customer_name}, your {service_name} service will expire on {expiry_date}. Please renew to avoid service interruption. Amount: ${amount}. Contact us for renewal.",
      variables: ["customer_name", "service_name", "expiry_date", "amount"],
    },
    {
      id: "2",
      name: "7 Day Urgent Reminder",
      type: "urgent",
      subject: "URGENT: Service Expiring Soon",
      message:
        "Dear {customer_name}, your {service_name} service expires in 7 days on {expiry_date}. Please renew immediately to avoid service disruption. Renewal amount: ${amount}.",
      variables: ["customer_name", "service_name", "expiry_date", "amount"],
    },
    {
      id: "3",
      name: "Expired Service Notice",
      type: "expired",
      subject: "Service Expired - Immediate Action Required",
      message:
        "Hi {customer_name}, your {service_name} service has expired on {expiry_date}. Please contact us immediately to renew and restore your service. Amount due: ${amount}.",
      variables: ["customer_name", "service_name", "expiry_date", "amount"],
    },
  ])

  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    type: "reminder",
    subject: "",
    message: "",
  })

  const handleEdit = (template) => {
    setSelectedTemplate(template)
    setFormData({
      name: template.name,
      type: template.type,
      subject: template.subject,
      message: template.message,
    })
    setIsEditing(true)
  }

  const handleSave = () => {
    if (selectedTemplate) {
      // Update existing template
      setTemplates(templates.map((t) => (t.id === selectedTemplate.id ? { ...t, ...formData } : t)))
    } else {
      // Add new template
      const newTemplate = {
        id: Date.now().toString(),
        ...formData,
        variables: ["customer_name", "service_name", "expiry_date", "amount"],
      }
      setTemplates([...templates, newTemplate])
    }
    setIsEditing(false)
    setSelectedTemplate(null)
    setFormData({ name: "", type: "reminder", subject: "", message: "" })
  }

  const handleDelete = (templateId) => {
    setTemplates(templates.filter((t) => t.id !== templateId))
  }

  const getTypeBadge = (type) => {
    switch (type) {
      case "reminder":
        return <Badge className="bg-blue-100 text-blue-800">Reminder</Badge>
      case "urgent":
        return <Badge className="bg-yellow-100 text-yellow-800">Urgent</Badge>
      case "expired":
        return <Badge className="bg-red-100 text-red-800">Expired</Badge>
      default:
        return <Badge variant="secondary">{type}</Badge>
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>WhatsApp Message Templates</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="templates" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="variables">Variables</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-4">
            {!isEditing ? (
              <>
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Message Templates</h3>
                  <Button onClick={() => setIsEditing(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    New Template
                  </Button>
                </div>

                <div className="space-y-4">
                  {templates.map((template) => (
                    <Card key={template.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base">{template.name}</CardTitle>
                            {getTypeBadge(template.type)}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleEdit(template)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(template.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <CardDescription>{template.subject}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{template.message}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{selectedTemplate ? "Edit Template" : "New Template"}</h3>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false)
                      setSelectedTemplate(null)
                      setFormData({ name: "", type: "reminder", subject: "", message: "" })
                    }}
                  >
                    Cancel
                  </Button>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="templateName">Template Name</Label>
                    <Input
                      id="templateName"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter template name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="templateType">Template Type</Label>
                    <select
                      id="templateType"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                    >
                      <option value="reminder">Reminder</option>
                      <option value="urgent">Urgent</option>
                      <option value="expired">Expired</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="templateSubject">Subject</Label>
                    <Input
                      id="templateSubject"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="Enter message subject"
                    />
                  </div>

                  <div>
                    <Label htmlFor="templateMessage">Message</Label>
                    <Textarea
                      id="templateMessage"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Enter your message template..."
                      rows={6}
                    />
                  </div>

                  <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                    {selectedTemplate ? "Update" : "Create"} Template
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="variables" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Available Variables</CardTitle>
                <CardDescription>
                  Use these variables in your message templates. They will be automatically replaced with actual values.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm">{"{customer_name}"}</code>
                      <span className="text-sm text-gray-600">Customer's name</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm">{"{service_name}"}</code>
                      <span className="text-sm text-gray-600">Service name</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm">{"{expiry_date}"}</code>
                      <span className="text-sm text-gray-600">Service expiry date</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm">{"{amount}"}</code>
                      <span className="text-sm text-gray-600">Renewal amount</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm">{"{business_name}"}</code>
                      <span className="text-sm text-gray-600">Your business name</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm">{"{days_left}"}</code>
                      <span className="text-sm text-gray-600">Days until expiry</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm">{"{phone_number}"}</code>
                      <span className="text-sm text-gray-600">Customer's phone</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm">{"{renewal_url}"}</code>
                      <span className="text-sm text-gray-600">Renewal link</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
