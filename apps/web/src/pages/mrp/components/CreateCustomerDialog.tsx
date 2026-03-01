import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateCustomerMutation } from '@/hooks/mrp/useQuality';
import { Loader2 } from 'lucide-react';
import { Customer } from '@scaffold/types';

interface CreateCustomerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialSearch?: string;
    onSuccess?: (customer: Customer) => void;
}

export function CreateCustomerDialog({ open, onOpenChange, initialSearch = '', onSuccess }: CreateCustomerDialogProps) {
    const { execute: createCustomer, loading } = useCreateCustomerMutation();

    const [formState, setFormState] = useState({
        personType: 'natural',
        documentType: 'CC',
        documentNumber: '',
        name: '',
        address: '',
        email: '',
        phone: '',
    });

    // Update name when search changes and dialog opens
    useEffect(() => {
        if (open) {
            setFormState(prev => ({
                ...prev,
                name: initialSearch.trim(),
            }));
        }
    }, [open, initialSearch]);

    const handlePersonTypeChange = (value: string) => {
        setFormState(prev => ({
            ...prev,
            personType: value,
            documentType: value === 'legal' ? 'NIT' : 'CC',
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const result = await createCustomer({
                name: formState.name,
                documentType: formState.documentType,
                documentNumber: formState.documentNumber,
                address: formState.address || undefined,
                email: formState.email || undefined,
                phone: formState.phone || undefined,
            });

            if (result && onSuccess) {
                onSuccess(result as any);
            }
            onOpenChange(false);

            // Reset form
            setFormState({
                personType: 'natural',
                documentType: 'CC',
                documentNumber: '',
                name: '',
                address: '',
                email: '',
                phone: '',
            });
        } catch (error) {
            // Error is handled by the hook/toast
            console.error('Failed to create customer', error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Crear Nuevo Cliente</DialogTitle>
                    <DialogDescription>
                        Ingresa los datos del nuevo cliente para asociarlo al pedido.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-3">
                        <Label>Tipo de Persona</Label>
                        <RadioGroup
                            defaultValue="natural"
                            value={formState.personType}
                            onValueChange={handlePersonTypeChange}
                            className="flex gap-4"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="natural" id="r-natural" />
                                <Label htmlFor="r-natural" className="font-normal cursor-pointer">Natural</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="legal" id="r-legal" />
                                <Label htmlFor="r-legal" className="font-normal cursor-pointer">Jurídica</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="docType">Tipo de Doc.</Label>
                            <Select
                                value={formState.documentType}
                                onValueChange={(val) => setFormState(prev => ({ ...prev, documentType: val }))}
                            >
                                <SelectTrigger id="docType">
                                    <SelectValue placeholder="Tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CC">Cédula (CC)</SelectItem>
                                    <SelectItem value="NIT">NIT</SelectItem>
                                    <SelectItem value="CE">Cédula Ext. (CE)</SelectItem>
                                    <SelectItem value="PA">Pasaporte</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="docNumber">Número de Documento</Label>
                            <Input
                                id="docNumber"
                                value={formState.documentNumber}
                                onChange={(e) => setFormState(prev => ({ ...prev, documentNumber: e.target.value }))}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="name">Nombre / Razón Social *</Label>
                        <Input
                            id="name"
                            value={formState.name}
                            onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="address">Dirección</Label>
                        <Input
                            id="address"
                            value={formState.address}
                            onChange={(e) => setFormState(prev => ({ ...prev, address: e.target.value }))}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="phone">Teléfono</Label>
                            <Input
                                id="phone"
                                value={formState.phone}
                                onChange={(e) => setFormState(prev => ({ ...prev, phone: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formState.email}
                                onChange={(e) => setFormState(prev => ({ ...prev, email: e.target.value }))}
                            />
                        </div>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Crear Cliente
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
