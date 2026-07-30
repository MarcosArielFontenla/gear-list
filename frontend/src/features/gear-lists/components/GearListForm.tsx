import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { getApiErrorMessage } from "../../../shared/api/httpClient";
import { Modal } from "../../../shared/components/Modal";
import { useGearListMutations } from "../hooks/useGearLists";
import type { GearList } from "../types";
import { useNetwork } from "../../../pwa/offline/NetworkProvider";

const schema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(120),
  description: z.string().trim().max(1000).optional(),
});

type Values = z.infer<typeof schema>;

export function GearListForm({
  list,
  onClose,
}: {
  list?: GearList;
  onClose: () => void;
}) {
  const mutations = useGearListMutations();
  const mutation = list ? mutations.update : mutations.create;
  const { isOnline } = useNetwork();
  const [apiError, setApiError] = useState<string | null>(null);
  const {
    register,
    reset,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: list?.name ?? "",
      description: list?.description ?? "",
    },
  });

  useEffect(() => {
    reset({
      name: list?.name ?? "",
      description: list?.description ?? "",
    });
  }, [list, reset]);

  const onSubmit = handleSubmit(async (values) => {
    setApiError(null);
    try {
      const input = {
        name: values.name,
        description: values.description || null,
      };
      if (list) {
        await mutations.update.mutateAsync({ id: list.id, input });
      } else {
        await mutations.create.mutateAsync(input);
      }
      onClose();
    } catch (error) {
      setApiError(getApiErrorMessage(error));
    }
  });

  return (
    <Modal
      title={list ? "Editar lista" : "Nueva lista"}
      description="Agrupa accesorios para un objetivo o configuración."
      onClose={onClose}
    >
      <form
        aria-busy={isSubmitting || mutation.isPending}
        className="form-stack"
        onSubmit={onSubmit}
        noValidate
      >
        {apiError && <p className="form-alert" role="alert">{apiError}</p>}
        <label className="field">
          <span>Nombre</span>
          <input
            aria-describedby={errors.name ? "gear-list-name-error" : undefined}
            aria-invalid={Boolean(errors.name)}
            autoFocus
            {...register("name")}
          />
          {errors.name && <small id="gear-list-name-error" role="alert">{errors.name.message}</small>}
        </label>
        <label className="field">
          <span>Descripción</span>
          <textarea
            aria-describedby={errors.description ? "gear-list-description-error" : undefined}
            aria-invalid={Boolean(errors.description)}
            rows={4}
            {...register("description")}
          />
          {errors.description && <small id="gear-list-description-error" role="alert">{errors.description.message}</small>}
        </label>
        <div className="form-actions">
          <button className="button button-secondary" onClick={onClose} type="button">
            Cancelar
          </button>
          <button
            className="button button-primary"
            disabled={!isOnline || isSubmitting || mutation.isPending}
            title={!isOnline ? "Esta acción requiere conexión." : undefined}
            type="submit"
          >
            {isSubmitting ? "Guardando..." : "Guardar lista"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
