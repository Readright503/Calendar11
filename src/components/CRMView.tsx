import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Users, Clock, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

export interface Client {
  id: string;
  name: string;
  phone: string;
  status: 'Lead' | 'Consultation' | 'In Progress' | 'Completed';
  notes: string;
}

export interface Appointment {
  id: string;
  name: string;
  phone: string;
  details: string;
  datetime: string;
  clientId?: string;
}

interface CRMViewProps {
  appointments: Appointment[];
  selectedClientId?: string;
  onAppointmentClick: (appointment: Appointment) => void;
}

const STORAGE_KEY = 'quickSchedulerClients';

export function CRMView({ appointments, selectedClientId, onAppointmentClick }: CRMViewProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    status: 'Lead' as Client['status'],
    notes: ''
  });

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (selectedClientId && clients.length > 0) {
      const client = clients.find(c => c.id === selectedClientId);
      if (client) {
        openDetailModal(client);
      }
    }
  }, [selectedClientId, clients]);

  const loadClients = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setClients(JSON.parse(stored));
      } catch (error) {
        console.error('Error loading clients:', error);
        setClients([]);
      }
    }
  };

  const saveClients = (updatedClients: Client[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedClients));
    setClients(updatedClients);
  };

  const handleAddClient = () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast.error('Name and phone are required');
      return;
    }

    const newClient: Client = {
      id: crypto.randomUUID(),
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      status: formData.status,
      notes: formData.notes.trim()
    };

    const updatedClients = [...clients, newClient];
    saveClients(updatedClients);
    toast.success('Client added successfully');
    resetForm();
    setIsAddModalOpen(false);
  };

  const handleUpdateClient = () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast.error('Name and phone are required');
      return;
    }

    if (!selectedClient) return;

    const updatedClients = clients.map(client =>
      client.id === selectedClient.id
        ? {
            ...client,
            name: formData.name.trim(),
            phone: formData.phone.trim(),
            status: formData.status,
            notes: formData.notes.trim()
          }
        : client
    );

    saveClients(updatedClients);
    setSelectedClient(updatedClients.find(c => c.id === selectedClient.id) || null);
    toast.success('Client updated successfully');
  };

  const handleDeleteClient = (id: string) => {
    const updatedClients = clients.filter(client => client.id !== id);
    saveClients(updatedClients);
    toast.success('Client deleted successfully');
  };

  const openDetailModal = (client: Client) => {
    setSelectedClient(client);
    setFormData({
      name: client.name,
      phone: client.phone,
      status: client.status,
      notes: client.notes
    });
    setIsDetailModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      status: 'Lead',
      notes: ''
    });
  };

  const getStatusColor = (status: Client['status']) => {
    const colors = {
      'Lead': 'bg-gray-100 text-gray-800',
      'Consultation': 'bg-blue-100 text-blue-800',
      'In Progress': 'bg-yellow-100 text-yellow-800',
      'Completed': 'bg-green-100 text-green-800'
    };
    return colors[status];
  };

  const getAppointmentCount = (clientId: string) => {
    return appointments.filter(apt => apt.clientId === clientId).length;
  };

  const getClientAppointments = (clientId: string) => {
    return appointments
      .filter(apt => apt.clientId === clientId)
      .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
  };

  const formatDateTime = (datetime: string) => {
    const date = new Date(datetime);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold">Clients</h3>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Client
        </Button>
      </div>

      <div className="border rounded-lg overflow-x-auto bg-white">
        <Table className="min-w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[200px]">Name</TableHead>
              <TableHead className="min-w-[150px]">Phone</TableHead>
              <TableHead className="min-w-[120px]">Status</TableHead>
              <TableHead className="hidden md:table-cell min-w-[200px]">Notes</TableHead>
              <TableHead className="text-right min-w-[220px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                  No clients yet. Click "Add Client" to get started.
                </TableCell>
              </TableRow>
            ) : (
              clients.map(client => {
                const appointmentCount = getAppointmentCount(client.id);
                return (
                  <TableRow key={client.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium min-w-[200px]">
                      <button
                        onClick={() => openDetailModal(client)}
                        className="bg-white text-black hover:underline flex items-center gap-2"
                      >
                        {client.name}
                        {appointmentCount > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {appointmentCount}
                          </Badge>
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="min-w-[150px]">{client.phone}</TableCell>
                    <TableCell className="min-w-[120px]">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(client.status)}`}>
                        {client.status}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell min-w-[200px] max-w-xs truncate">
                      {client.notes || '-'}
                    </TableCell>
                    <TableCell className="text-right min-w-[220px]">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDetailModal(client)}
                          className="bg-white text-black border-gray-300 hover:bg-gray-100"
                        >
                          <Pencil className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteClient(client.id)}
                          className="bg-white text-black border-gray-300 hover:bg-gray-100"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isAddModalOpen} onOpenChange={(open) => {
        setIsAddModalOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-name">Name *</Label>
              <Input
                id="add-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-phone">Phone *</Label>
              <Input
                id="add-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(720) 555-1234"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as Client['status'] })}
              >
                <SelectTrigger id="add-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Lead">Lead</SelectItem>
                  <SelectItem value="Consultation">Consultation</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-notes">Notes</Label>
              <Textarea
                id="add-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional information..."
                rows={3}
              />
            </div>

            <Button onClick={handleAddClient} className="w-full">
              Add Client
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailModalOpen} onOpenChange={(open) => {
        setIsDetailModalOpen(open);
        if (!open) {
          resetForm();
          setSelectedClient(null);
        }
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Client Details</DialogTitle>
          </DialogHeader>

          {selectedClient && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="detail-name">Name *</Label>
                  <Input
                    id="detail-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="detail-phone">Phone *</Label>
                  <Input
                    id="detail-phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(720) 555-1234"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="detail-status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value as Client['status'] })}
                  >
                    <SelectTrigger id="detail-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Lead">Lead</SelectItem>
                      <SelectItem value="Consultation">Consultation</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="detail-notes">Notes</Label>
                  <Textarea
                    id="detail-notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional information..."
                    rows={3}
                  />
                </div>

                <Button onClick={handleUpdateClient} className="w-full">
                  Save Changes
                </Button>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-gray-600" />
                  <h3 className="font-semibold text-lg">Upcoming Appointments</h3>
                </div>

                {(() => {
                  const clientAppointments = getClientAppointments(selectedClient.id);
                  return clientAppointments.length === 0 ? (
                    <p className="text-gray-500 text-sm py-4">No appointments scheduled</p>
                  ) : (
                    <div className="space-y-2">
                      {clientAppointments.map(apt => (
                        <button
                          key={apt.id}
                          onClick={() => {
                            setIsDetailModalOpen(false);
                            onAppointmentClick(apt);
                          }}
                          className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Clock className="w-4 h-4 text-gray-500" />
                                <span className="font-medium text-sm">{formatDateTime(apt.datetime)}</span>
                              </div>
                              <p className="text-sm text-gray-600">{apt.details}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
