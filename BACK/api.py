# api.py
# Ejecutar con: uvicorn api:app --reload

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pyodbc
import pandas as pd

# Silenciar advertencias
import warnings
warnings.filterwarnings('ignore')

app = FastAPI(title="API Contoso Admin")

# --- CONFIGURACIÓN ---
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STR_CONN = (
        'DRIVER={ODBC Driver 17 for SQL Server};'
        'SERVER=MIGUEL;'
        'DATABASE=Contoso 100K;'
        'Trusted_Connection=yes;'
)

def get_data_from_sql(query):
    try:
        conn = pyodbc.connect(STR_CONN)
        df = pd.read_sql(query, conn)
        conn.close()
        return df.to_dict(orient='records')
    except Exception as e:
        print(f"❌ Error SQL: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- LÓGICA DE FECHAS (MÁQUINA DEL TIEMPO) ---
def generar_where_fecha(dias: str, alias_tabla: str = "O"):
    """
    Genera filtro de fecha simulando que 'HOY' es el final de los datos (2021-01-01).
    Así los botones de 7d/30d funcionan con datos de 2020.
    """
    if dias == 'ALL' or dias == 'Histórico': 
        return ""
    
    try:
        num_dias = int(dias.replace('d', '').replace('YTD', '365'))
        # TRUCO: En lugar de GETDATE(), usamos '2021-01-01' como fecha de referencia
        return f"AND {alias_tabla}.[Order Date] >= DATEADD(day, -{num_dias}, '2021-01-01')"
    except:
        return ""

# --- ENDPOINTS GENERALES ---

@app.get("/")
def home():
    return {"status": "online", "mode": "Admin Time-Travel"}

@app.get("/kpis")
def obtener_kpis(dias: str = "ALL"):
    where_clause = generar_where_fecha(dias, "O")
    sql = f"""
    SELECT 
        SUM(R.Quantity * R.[Unit Price]) AS TotalVentas,
        COUNT(DISTINCT R.OrderKey) AS TotalPedidos,
        AVG(R.Quantity * R.[Unit Price]) AS TicketPromedio
    FROM [Data].[OrderRows] R
    JOIN [Data].[Orders] O ON R.OrderKey = O.OrderKey
    WHERE 1=1 {where_clause}
    """
    data = get_data_from_sql(sql)
    return data[0] if data else {}

@app.get("/analisis-financiero")
def obtener_financiero(dias: str = "ALL"):
    where_clause = generar_where_fecha(dias, "O")
    sql = f"""
    SELECT 
        FORMAT(O.[Order Date], 'yyyy-MM') as Mes, 
        SUM(R.Quantity * R.[Unit Price]) as Ventas,
        SUM(R.Quantity * R.[Unit Cost]) as Costos,
        SUM((R.Quantity * R.[Unit Price]) - (R.Quantity * R.[Unit Cost])) as Ganancia
    FROM [Data].[OrderRows] R
    JOIN [Data].[Orders] O ON R.OrderKey = O.OrderKey
    WHERE 1=1 {where_clause}
    GROUP BY FORMAT(O.[Order Date], 'yyyy-MM')
    ORDER BY Mes
    """
    return get_data_from_sql(sql)

@app.get("/top-productos")
def obtener_top_productos(dias: str = "ALL"):
    where_clause = generar_where_fecha(dias, "O")
    sql = f"""
    SELECT TOP 10 
        P.[Product Name] as Producto, 
        SUM(R.Quantity * R.[Unit Price]) as Ventas
    FROM [Data].[OrderRows] R
    JOIN [Data].[Product] P ON R.ProductKey = P.ProductKey
    JOIN [Data].[Orders] O ON R.OrderKey = O.OrderKey
    WHERE 1=1 {where_clause}
    GROUP BY P.[Product Name]
    ORDER BY Ventas DESC
    """
    return get_data_from_sql(sql)

@app.get("/ultimas-ordenes")
def obtener_ultimas_ordenes(dias: str = "ALL"):
    where_clause = generar_where_fecha(dias, "O")
    sql = f"""
    SELECT TOP 10
        O.OrderKey,
        FORMAT(O.[Order Date], 'yyyy-MM-dd') as Fecha,
        C.Company as Cliente,
        SUM(R.Quantity * R.[Unit Price]) as Total
    FROM [Data].[Orders] O
    JOIN [Data].[OrderRows] R ON O.OrderKey = R.OrderKey
    JOIN [Data].[Customer] C ON O.CustomerKey = C.CustomerKey
    WHERE 1=1 {where_clause}
    GROUP BY O.OrderKey, O.[Order Date], C.Company
    ORDER BY O.[Order Date] DESC
    """
    return get_data_from_sql(sql)

# --- ENDPOINTS ADMIN ---

@app.get("/top-clientes")
def obtener_top_clientes(dias: str = "ALL"):
    # NUEVO: Reemplaza demografía. Top Empresas compradoras.
    where_clause = generar_where_fecha(dias, "O")
    sql = f"""
    SELECT TOP 10
        C.Company as Cliente,
        SUM(R.Quantity * R.[Unit Price]) as TotalComprado
    FROM [Data].[OrderRows] R
    JOIN [Data].[Orders] O ON R.OrderKey = O.OrderKey
    JOIN [Data].[Customer] C ON O.CustomerKey = C.CustomerKey
    WHERE C.Company IS NOT NULL AND C.Company <> '' {where_clause}
    GROUP BY C.Company
    ORDER BY TotalComprado DESC
    """
    return get_data_from_sql(sql)

@app.get("/admin/rentabilidad-categoria")
def obtener_rentabilidad_categoria(dias: str = "ALL"):
    where_clause = generar_where_fecha(dias, "O")
    sql = f"""
    SELECT TOP 15
        P.Category as Categoria,
        SUM((R.Quantity * R.[Unit Price]) - (R.Quantity * R.[Unit Cost])) as GananciaNeta
    FROM [Data].[OrderRows] R
    JOIN [Data].[Product] P ON R.ProductKey = P.ProductKey
    JOIN [Data].[Orders] O ON R.OrderKey = O.OrderKey
    WHERE 1=1 {where_clause}
    GROUP BY P.Category
    ORDER BY GananciaNeta DESC
    """
    return get_data_from_sql(sql)

@app.get("/admin/ventas-globales")
def obtener_ventas_globales(dias: str = "ALL"):
    where_clause = generar_where_fecha(dias, "O")
    sql = f"""
    SELECT TOP 10
        C.Country as Pais,
        SUM(R.Quantity * R.[Unit Price]) as Ventas
    FROM [Data].[OrderRows] R
    JOIN [Data].[Orders] O ON R.OrderKey = O.OrderKey
    JOIN [Data].[Customer] C ON O.CustomerKey = C.CustomerKey
    WHERE C.Country IS NOT NULL {where_clause}
    GROUP BY C.Country
    ORDER BY Ventas DESC
    """
    return get_data_from_sql(sql)

@app.get("/admin/geo-clientes")
def obtener_geo_clientes():
    # Base instalada (sin filtro de fecha usualmente)
    sql = """
    SELECT TOP 60
        Country as Pais,
        State as Estado,
        NumCustomers as TotalClientes
    FROM [Data].[GeoLocations]
    WHERE NumCustomers > 0
    ORDER BY NumCustomers DESC
    """
    return get_data_from_sql(sql)