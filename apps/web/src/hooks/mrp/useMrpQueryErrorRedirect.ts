import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api-error';

export const useMrpQueryErrorRedirect = (
    error: unknown,
    fallbackMessage: string,
    redirectPath: string
) => {
    const { toast } = useToast();
    const navigate = useNavigate();

    useEffect(() => {
        if (!error) return;
        toast({
            title: 'Error',
            description: getErrorMessage(error, fallbackMessage),
            variant: 'destructive',
        });
        navigate(redirectPath);
    }, [error, fallbackMessage, navigate, redirectPath, toast]);
};

