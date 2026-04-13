-- Agregar columna ciudad_planta a budget_lines
ALTER TABLE public.budget_lines 
ADD COLUMN IF NOT EXISTS ciudad_planta TEXT;

-- Agregar comentario para documentación
COMMENT ON COLUMN public.budget_lines.ciudad_planta IS 'Ciudad o planta asociada a la línea presupuestal';
