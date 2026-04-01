import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import SuperAdminLayout from '../../../../components/layout/SuperAdminLayout';
import axios from '../../../../lib/axios';
import { ArrowLeft } from 'phosphor-react';

export default function TenantImportsPage() {
  const router = useRouter();
  const { id } = router.query;
  const [tenant, setTenant] = useState<any>(null);

  useEffect(() => {
    if (id) {
      loadTenant();
    }
  }, [id]);

  const loadTenant = async () => {
    try {
      const response = await axios.get(`/api/super-admin/tenants/${id}`);
      setTenant(response.data.tenant);
    } catch (error) {
      console.error('Errore:', error);
    }
  };

  const startImport = () => {
    // Reindirizza al wizard import passando tenant
    router.push(`/admin/imports?tenantId=${id}`);
  };

  return (
    <SuperAdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Indietro</span>
        </button>

        {tenant && (
          <div>
            <h1 className="text-3xl font-bold mb-4">Import per {tenant.name}</h1>
            <button
              onClick={startImport}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium"
            >
              Avvia Nuovo Import
            </button>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}