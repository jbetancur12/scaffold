import { useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api-error';

export const useMrpQueryErrorToast = (error: unknown, fallbackMessage: string) => {
    const { toast } = useToast();

    useEffect(() => {
        if (!error) return;
        toast({
            title: 'Error',
            description: getErrorMessage(error, fallbackMessage),
            variant: 'destructive',
        });
    }, [error, fallbackMessage, toast]);
};

