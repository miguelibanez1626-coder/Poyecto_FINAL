# api.py
# Ejecutar con: uvicorn api:app --reload

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import pyodbc
import pandas as pd
import warnings

# Silenciar advertencias de pandas
warnings.filterwarnings('ignore')

app = FastAPI(title="API Contoso Multi-Rol")

# --- 1. CONFIGURACIÓN DE SEGURIDAD ---
# ¡IMPORTANTE! En producción, cambia esta clave por una larga y aleatoria
SECRET_KEY = "mi_clave_secreta_super_segura_para_contoso_2025"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 # El token dura 1 hora

# Configuración para Hash de contraseñas (aunque por ahora usaremos texto plano en DB para facilitar pruebas)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# --- 2. CONFIGURACIÓN DE BASE DE DATOS ---
STR_CONN = (
        'DRIVER={ODBC Driver 17 for SQL Server};'
        'SERVER=MIGUEL;'  # Asegúrate que este sea tu servidor correcto
        'DATABASE=Contoso 100K;'
        'Trusted_Connection=yes;'
)

# --- 3. FUNCIONES AUXILIARES (DB Y AUTH) ---
# --- MODELO PARA EL REGISTRO ---
class UserRegister(BaseModel):
    firstName: str
    lastName: str
    email: str
    password: str
    
def get_data_from_sql(query):
    """Ejecuta una consulta SQL y devuelve una lista de diccionarios"""
    try:
        conn = pyodbc.connect(STR_CONN)
        df = pd.read_sql(query, conn)
        conn.close()
        return df.to_dict(orient='records')
    except Exception as e:
        print(f"❌ Error SQL: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def autenticar_cliente_sql(email, password):
    """Busca un cliente en la BD por Email y Password"""
    # Consulta ajustada a las columnas que creamos en el script SQL anterior
    query = f"""
    SELECT CustomerKey, GivenName, Surname 
    FROM [Data].[Customer] 
    WHERE EmailAddress = '{email}' AND Password = '{password}'
    """
    try:
        conn = pyodbc.connect(STR_CONN)
        df = pd.read_sql(query, conn)
        conn.close()
        
        if not df.empty:
            row = df.iloc[0]
            # Construimos el nombre completo para el frontend
            full_name = f"{row['GivenName']} {row['Surname']}"
            return {
                "username": email, 
                "role": "cliente", 
                "name": full_name
            }
        return None
    except Exception as e:
        print(f"❌ Error SQL Auth: {e}")
        return None

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    """Genera el token JWT"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# --- AGREGAR ESTA FUNCIÓN QUE FALTA ---
async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    return username
# --------------------------------------

# --- 4. CONFIGURACIÓN CORS (Permitir Frontend) ---
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

# --- 5. ENDPOINTS DE AUTENTICACIÓN ---
# --- NUEVO ENDPOINT: HISTORIAL DE COMPRAS DEL CLIENTE ---
@app.get("/mis-compras")
def obtener_mis_compras(current_user: str = Depends(get_current_user)):
    """
    Busca las compras realizadas por el usuario logueado.
    Cruza las tablas Orders, Customer y OrderRows.
    """
    print(f"Buscando compras para: {current_user}")
    
    sql = f"""
    SELECT TOP 20
        O.OrderKey,
        FORMAT(O.[Order Date], 'yyyy-MM-dd') as Fecha,
        COUNT(R.ProductKey) as CantidadItems,
        SUM(R.Quantity * R.[Unit Price]) as Total,
        MAX(C.Country) as PaisEnvio
    FROM [Data].[Orders] O
    JOIN [Data].[Customer] C ON O.CustomerKey = C.CustomerKey
    JOIN [Data].[OrderRows] R ON O.OrderKey = R.OrderKey
    WHERE C.EmailAddress = '{current_user}'
    GROUP BY O.OrderKey, O.[Order Date]
    ORDER BY O.[Order Date] DESC
    """
    return get_data_from_sql(sql)

@app.post("/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user_data = None

    # CASO A: Es el Administrador (Hardcoded)
    if form_data.username == "admin" and form_data.password == "contoso":
        user_data = {"username": "admin", "role": "admin", "name": "Administrador"}
    
    # CASO B: Es un Cliente (Busca en SQL)
    else:
        user_data = autenticar_cliente_sql(form_data.username, form_data.password)

    # Si fallan ambos
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Generar Token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    # IMPORTANTE: Guardamos el 'role' y el 'name' dentro del token para que el Front sepa qué mostrar
    access_token = create_access_token(
        data={"sub": user_data["username"], "role": user_data["role"], "name": user_data["name"]}, 
        expires_delta=access_token_expires
    )
    
    # Devolvemos el token y datos extra para el login del frontend
    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "role": user_data["role"], 
        "name": user_data["name"]
    }

# --- 6. ENDPOINTS PARA CLIENTES (NUEVO) ---
# --- NUEVO ENDPOINT: PRODUCTOS DESTACADOS (TRENDING) ---
@app.get("/destacados")
def obtener_destacados():
    """
    Devuelve los 4 productos más vendidos basados en el historial de OrderRows.
    Ideal para la sección 'Trending' del cliente.
    """
    sql = """
    SELECT TOP 4
        P.ProductKey,
        P.[Product Name] as ProductName,
        P.Category,
        P.Brand,
        P.[Unit Price] as UnitPrice,
        SUM(R.Quantity) as TotalVendidos
    FROM [Data].[OrderRows] R
    JOIN [Data].[Product] P ON R.ProductKey = P.ProductKey
    GROUP BY P.ProductKey, P.[Product Name], P.Category, P.Brand, P.[Unit Price]
    ORDER BY TotalVendidos DESC
    """
    return get_data_from_sql(sql)

@app.get("/productos")
def obtener_catalogo():
    """Devuelve 50 productos ALEATORIOS para que el catálogo se vea variado"""
    sql = """
    SELECT TOP 50 
        ProductKey,
        [Product Name] as ProductName,
        Brand,
        [Unit Price] as UnitPrice,
        Subcategory,
        Category
    FROM [Data].[Product]
    WHERE [Unit Price] > 0
    ORDER BY NEWID() 
    """
    # NOTA: 'ORDER BY NEWID()' es el truco en SQL Server para desordenar aleatoriamente
    return get_data_from_sql(sql)

# --- ENDPOINT DE REGISTRO ---
@app.post("/register")
async def register_user(user: UserRegister):
    """Registra un nuevo cliente en la base de datos"""
    try:
        with pyodbc.connect(STR_CONN) as conn:
            cursor = conn.cursor()
            
            # 1. Verificar si el correo ya existe
            check_query = "SELECT COUNT(*) FROM [Data].[Customer] WHERE EmailAddress = ?"
            cursor.execute(check_query, (user.email,))
            if cursor.fetchone()[0] > 0:
                raise HTTPException(status_code=400, detail="El correo electrónico ya está registrado")

            # 2. Insertar el nuevo usuario
            insert_query = """
            INSERT INTO [Data].[Customer] (GivenName, Surname, EmailAddress, Password)
            VALUES (?, ?, ?, ?)
            """
            cursor.execute(insert_query, (user.firstName, user.lastName, user.email, user.password))
            conn.commit() # ¡Importante para guardar cambios!
            
            return {"message": "Usuario registrado exitosamente"}
            
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"❌ Error Registro: {e}")
        raise HTTPException(status_code=500, detail="Error al registrar usuario")

# --- 7. ENDPOINTS PARA ADMINISTRADOR (ORIGINALES) ---
# Nota: La función 'generar_where_fecha' se usa para simular "viaje en el tiempo" a 2021

def generar_where_fecha(dias: str, alias_tabla: str = "O"):
    if dias == 'ALL' or dias == 'Histórico': 
        return ""
    try:
        num_dias = int(dias.replace('d', '').replace('YTD', '365'))
        return f"AND {alias_tabla}.[Order Date] >= DATEADD(day, -{num_dias}, '2021-01-01')"
    except:
        return ""

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

@app.get("/top-clientes")
def obtener_top_clientes(dias: str = "ALL"):
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

@app.get("/admin/geo-clientes")
def obtener_geo_clientes():
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

@app.get("/")
def home():
    return {"status": "online", "mode": "Multi-Rol System (Admin + Clientes)"}