# ── 빌드 스테이지 ──────────────────────────────────────
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# 의존성 레이어 캐시 — pom.xml이 안 바뀌면 재다운로드 없음
COPY pom.xml .
RUN mvn -q dependency:go-offline

COPY src ./src
RUN mvn -q package -DskipTests

# ── 실행 스테이지 ──────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN addgroup -S app && adduser -S app -G app \
    && mkdir -p /app/data && chown -R app:app /app

USER app

COPY --from=build /app/target/*.jar app.jar

# H2 데이터 파일 보존용 — 명명 볼륨이 이미지의 app 소유권을 이어받는다
VOLUME /app/data

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD wget -qO- http://127.0.0.1:8080/api/pois > /dev/null || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
